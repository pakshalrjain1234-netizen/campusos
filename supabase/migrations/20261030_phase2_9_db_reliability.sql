-- ============================================================================
-- Migration: 20261030_phase2_9_db_reliability.sql
-- Description: Phase 2.9 — Database Hardening, Search Path Remediation,
--              Concurrency Controls & Anti-Race-Condition Triggers
-- Security Standards:
--   1. Fix CVE search-path hijacking vulnerability on all SECURITY DEFINER functions
--      by enforcing explicit "SET search_path = public, pg_temp;".
--   2. Enforce principle of least privilege: Revoke execute permissions from PUBLIC
--      and grant explicitly to authenticated users.
--   3. Lifecycle state integrity triggers preventing duplicate goods receipt
--      and preventing reservations in disrupted / maintenance rooms.
--   4. Query performance indexing for high-frequency lookup columns.
-- Note: Do NOT execute remote Supabase migrations without explicit user approval.
-- ============================================================================

-- 1. HARDEN SECURITY DEFINER FUNCTIONS (SAFE SEARCH PATH)
-- Mitigates search-path hijacking attacks in PostgreSQL

CREATE OR REPLACE FUNCTION public.perform_stock_transaction_atomic(
  p_item_id         TEXT,
  p_type            TEXT,
  p_quantity        INTEGER,
  p_reason          TEXT,
  p_reference_type  TEXT,
  p_reference_id    TEXT,
  p_performed_by    TEXT,
  p_user_id         UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item            public.inventory_items%ROWTYPE;
  v_new_stock       INTEGER;
  v_tx_id           UUID;
  v_tx_number       TEXT;
BEGIN
  -- Strict row lock (FOR UPDATE) to eliminate concurrent race conditions
  SELECT * INTO v_item
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item with ID % does not exist.', p_item_id;
  END IF;

  -- Validate positive quantity
  IF p_quantity <= 0 AND p_type <> 'adjustment' THEN
    RAISE EXCEPTION 'Transaction quantity must be a positive integer.';
  END IF;

  -- Calculate new stock balance based on transaction type
  IF p_type IN ('stock_in', 'return') THEN
    v_new_stock := v_item.current_stock + p_quantity;
  ELSIF p_type IN ('stock_out', 'allocation', 'transfer') THEN
    IF v_item.current_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock. Item % has % % available, requested %.',
        v_item.name, v_item.current_stock, v_item.unit, p_quantity;
    END IF;
    v_new_stock := v_item.current_stock - p_quantity;
  ELSIF p_type = 'adjustment' THEN
    IF p_quantity < 0 THEN
      RAISE EXCEPTION 'Adjustment quantity cannot be negative.';
    END IF;
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

-- Restrict function execution permissions
REVOKE ALL ON FUNCTION public.perform_stock_transaction_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perform_stock_transaction_atomic TO authenticated;


-- 2. HARDEN CONFLICT DETECTION TRIGGER FUNCTION (SAFE SEARCH PATH)
CREATE OR REPLACE FUNCTION public.check_room_booking_conflict()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conflict_count INTEGER;
  v_conflicting_number TEXT;
  v_room_status TEXT;
BEGIN
  -- Verify target room is operational and not disrupted
  SELECT status INTO v_room_status
  FROM public.rooms
  WHERE id = NEW.room_id;

  IF v_room_status = 'disrupted' THEN
    RAISE EXCEPTION 'Room booking rejected: Target room % is currently marked as DISRUPTED.', NEW.room_code;
  END IF;

  IF v_room_status = 'maintenance' THEN
    RAISE EXCEPTION 'Room booking rejected: Target room % is undergoing MAINTENANCE.', NEW.room_code;
  END IF;

  -- Check for temporal overlap: [NEW.start_time, NEW.end_time) overlaps [start_time, end_time)
  SELECT COUNT(*), COALESCE(MAX(booking_number), '')
  INTO v_conflict_count, v_conflicting_number
  FROM public.room_bookings
  WHERE room_id = NEW.room_id
    AND booking_date = NEW.booking_date
    AND status IN ('pending', 'approved', 'reallocated')
    AND id <> COALESCE(NEW.id, '')
    AND (NEW.start_time < end_time AND NEW.end_time > start_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Double-booking conflict: Overlaps with existing booking % on %', v_conflicting_number, NEW.booking_date;
  END IF;

  RETURN NEW;
END;
$$;


-- 3. HARDEN ROOM DISRUPTION SYNCHRONIZATION FUNCTION (SAFE SEARCH PATH)
CREATE OR REPLACE FUNCTION public.handle_room_disruption_sync()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status IN ('reported', 'confirmed') THEN
    UPDATE public.rooms
    SET status = 'disrupted',
        active_disruption_id = NEW.id,
        updated_at = NOW()
    WHERE id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' THEN
    UPDATE public.rooms
    SET status = 'available',
        active_disruption_id = NULL,
        updated_at = NOW()
    WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$;


-- 4. PREVENT DUPLICATE GOODS RECEIPT AT DATABASE LEVEL
CREATE OR REPLACE FUNCTION public.prevent_duplicate_procurement_receipt()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'received' AND NEW.status = 'received' THEN
    RAISE EXCEPTION 'Integrity Violation: Requisition % has already been marked as received. Duplicate goods receipt is prohibited.', OLD.request_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_goods_receipt ON public.procurement_requests;
CREATE TRIGGER trg_prevent_duplicate_goods_receipt
  BEFORE UPDATE OF status ON public.procurement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_procurement_receipt();


-- 5. PERFORMANCE AND AUDIT INDEXES
CREATE INDEX IF NOT EXISTS idx_stock_tx_item_time ON public.stock_transactions(item_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_lookup ON public.room_bookings(room_id, booking_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_procurement_status ON public.procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_room_disruptions_room_status ON public.room_disruptions(room_id, status);
