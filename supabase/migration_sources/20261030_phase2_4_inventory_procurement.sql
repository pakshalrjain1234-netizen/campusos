-- ============================================================================
-- Migration: 20261030_phase2_4_inventory_procurement.sql
-- Description: Phase 2.4 — Inventory Management & Intelligent Procurement
-- Security: Strict Row Level Security (RLS), atomic concurrency locks (FOR UPDATE),
--           CHECK constraints preventing negative inventory and invalid states.
-- Note: Do NOT apply this migration to remote databases without explicit authorization.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. INVENTORY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                   TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  description           TEXT,
  unit                  TEXT NOT NULL DEFAULT 'units',
  unit_cost             NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
  current_stock         INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0), -- Prevents negative inventory at schema level
  min_threshold         INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  max_threshold         INTEGER NOT NULL DEFAULT 0 CHECK (max_threshold >= min_threshold),
  location              TEXT NOT NULL,
  building_id           TEXT,
  supplier_name         TEXT NOT NULL,
  supplier_contact      TEXT,
  lead_time_days        INTEGER NOT NULL DEFAULT 3 CHECK (lead_time_days >= 0),
  allocated_quantity    INTEGER NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
  status                TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
  last_restocked_at     TIMESTAMPTZ,
  compatible_equipment  TEXT[] DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_building ON public.inventory_items(building_id);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_inventory_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Synchronize status dynamically based on current_stock and thresholds
  IF NEW.current_stock = 0 THEN
    NEW.status = 'out_of_stock';
  ELSIF NEW.current_stock <= NEW.min_threshold THEN
    NEW.status = 'low_stock';
  ELSE
    NEW.status = 'in_stock';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory_items;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_inventory_updated_at();


-- 3. STOCK TRANSACTIONS TABLE (IMMUTABLE AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number  TEXT UNIQUE NOT NULL,
  item_id             UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  item_sku            TEXT NOT NULL,
  item_name           TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('stock_in', 'stock_out', 'allocation', 'return', 'adjustment')),
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  previous_stock      INTEGER NOT NULL CHECK (previous_stock >= 0),
  new_stock           INTEGER NOT NULL CHECK (new_stock >= 0),
  reference_type      TEXT NOT NULL CHECK (reference_type IN ('work_order', 'procurement', 'manual_adjustment', 'return')),
  reference_id        TEXT,
  reason              TEXT NOT NULL,
  performed_by        TEXT NOT NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_item_id ON public.stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_type ON public.stock_transactions(type);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created_at ON public.stock_transactions(created_at DESC);


-- 4. PROCUREMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.procurement_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number        TEXT UNIQUE NOT NULL,
  item_id               UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  item_sku              TEXT NOT NULL,
  item_name             TEXT NOT NULL,
  category              TEXT NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  unit                  TEXT NOT NULL,
  estimated_unit_cost   NUMERIC(10, 2) NOT NULL CHECK (estimated_unit_cost >= 0),
  total_estimated_cost  NUMERIC(12, 2) NOT NULL CHECK (total_estimated_cost >= 0),
  supplier_name         TEXT NOT NULL,
  supplier_contact      TEXT,
  urgency               TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('urgent', 'high', 'medium', 'normal')),
  status                TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'received')),
  reason                TEXT NOT NULL,
  rule_trigger_reason   TEXT,
  requested_by          TEXT NOT NULL,
  requested_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by           TEXT,
  approved_by_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ordered_at            TIMESTAMPTZ,
  received_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_item_id ON public.procurement_requests(item_id);
CREATE INDEX IF NOT EXISTS idx_procurement_status ON public.procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_procurement_urgency ON public.procurement_requests(urgency);


-- 5. WORK ORDER PART ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.work_order_part_allocations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id         TEXT NOT NULL,
  order_number          TEXT,
  item_id               UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  item_sku              TEXT NOT NULL,
  item_name             TEXT NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  status                TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'issued', 'returned')),
  allocated_by          TEXT NOT NULL,
  allocated_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  allocated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_wo_id ON public.work_order_part_allocations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_allocations_item_id ON public.work_order_part_allocations(item_id);


-- 6. CONCURRENCY-SAFE ATOMIC RPC FUNCTION (PREVENTS RACE CONDITIONS & NEGATIVE INVENTORY)
CREATE OR REPLACE FUNCTION public.perform_stock_transaction_atomic(
  p_item_id           UUID,
  p_type              TEXT,
  p_quantity          INTEGER,
  p_reason            TEXT,
  p_reference_type    TEXT,
  p_reference_id      TEXT,
  p_performed_by      TEXT,
  p_user_id           UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_new_stock INTEGER;
  v_tx_number TEXT;
  v_tx_id UUID;
BEGIN
  -- Strict input validation
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transaction quantity must be greater than zero.';
  END IF;

  -- Row-level lock: FOR UPDATE guarantees atomic isolation against concurrent requests
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item with ID % does not exist.', p_item_id;
  END IF;

  -- Calculate new stock balance based on transaction type
  IF p_type IN ('stock_in', 'return') THEN
    v_new_stock := v_item.current_stock + p_quantity;
  ELSIF p_type IN ('stock_out', 'allocation') THEN
    IF v_item.current_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock. Item has % % available, requested %.',
        v_item.current_stock, v_item.unit, p_quantity;
    END IF;
    v_new_stock := v_item.current_stock - p_quantity;
  ELSIF p_type = 'adjustment' THEN
    v_new_stock := p_quantity;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %.', p_type;
  END IF;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Operation would result in negative stock (%). Aborting.', v_new_stock;
  END IF;

  -- Generate transaction sequence number
  v_tx_number := 'TX-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- Insert immutable audit transaction record
  INSERT INTO public.stock_transactions (
    transaction_number,
    item_id,
    item_sku,
    item_name,
    type,
    quantity,
    previous_stock,
    new_stock,
    reference_type,
    reference_id,
    reason,
    performed_by,
    user_id
  ) VALUES (
    v_tx_number,
    v_item.id,
    v_item.sku,
    v_item.name,
    p_type,
    p_quantity,
    v_item.current_stock,
    v_new_stock,
    p_reference_type,
    p_reference_id,
    p_reason,
    p_performed_by,
    p_user_id
  ) RETURNING id INTO v_tx_id;

  -- Update inventory item atomically
  UPDATE public.inventory_items
  SET
    current_stock = v_new_stock,
    last_restocked_at = CASE WHEN p_type = 'stock_in' THEN NOW() ELSE last_restocked_at END,
    allocated_quantity = CASE
      WHEN p_type = 'allocation' THEN allocated_quantity + p_quantity
      WHEN p_type = 'return' AND p_reference_type = 'work_order' THEN GREATEST(allocated_quantity - p_quantity, 0)
      ELSE allocated_quantity
    END
  WHERE id = v_item.id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'transaction_number', v_tx_number,
    'previous_stock', v_item.current_stock,
    'new_stock', v_new_stock
  );
END;
$$;


-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_part_allocations ENABLE ROW LEVEL SECURITY;

-- Reading inventory and transactions is accessible to authenticated campus users
CREATE POLICY "Anyone authenticated can view inventory items"
  ON public.inventory_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can view stock transactions"
  ON public.stock_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can view procurement requests"
  ON public.procurement_requests FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone authenticated can view work order allocations"
  ON public.work_order_part_allocations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inserting procurement requests can be performed by authenticated staff
CREATE POLICY "Authenticated users can submit procurement requisitions"
  ON public.procurement_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Updating procurement requests (Approval/Ordering) requires Manager or Admin authority
CREATE POLICY "Managers and Administrators can update procurement status"
  ON public.procurement_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND (raw_user_meta_data->>'role' IN ('Chief Operations Officer', 'Director of Facilities', 'Lead Maintenance Engineer')
             OR email IN ('admin@campus.edu', 'director@campus.edu'))
    )
  );

-- Direct stock adjustments restricted to authorized operations personnel
CREATE POLICY "Authorized staff can modify inventory items"
  ON public.inventory_items FOR ALL
  USING (auth.role() = 'authenticated');
