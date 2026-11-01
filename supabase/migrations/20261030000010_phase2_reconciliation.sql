-- CampusOps migration 010: reconcile the active schema with the integrated API.
-- Additive and safe for databases that already applied migrations 001-009.
-- This file is local only; it has not been run against Supabase.

BEGIN;

-- Canonical role ids only. Legacy enum labels remain for historical compatibility,
-- while stored profile values are migrated to the six official roles.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
UPDATE public.profiles
SET role = public.normalize_role_name(role::TEXT)::app_role
WHERE role::TEXT <> public.normalize_role_name(role::TEXT);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_official_role_only;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_official_role_only
  CHECK (role::TEXT IN (
    'student_faculty', 'technician', 'department_manager',
    'facilities_administrator', 'procurement_approver', 'system_administrator'
  ));

-- Operational inventory fields expected by the frontend and inventory API.
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS max_threshold INTEGER,
  ADD COLUMN IF NOT EXISTS building_id TEXT REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_contact TEXT,
  ADD COLUMN IF NOT EXISTS allocated_quantity INTEGER NOT NULL DEFAULT 0 CHECK (allocated_quantity >= 0),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compatible_equipment TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_status_valid;
ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_items_status_valid
  CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock'));

-- One canonical stock ledger supports both legacy API aliases and RPC writes.
ALTER TABLE public.stock_transactions
  ADD COLUMN IF NOT EXISTS transaction_number TEXT,
  ADD COLUMN IF NOT EXISTS item_sku TEXT,
  ADD COLUMN IF NOT EXISTS item_name TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS previous_stock INTEGER,
  ADD COLUMN IF NOT EXISTS new_stock INTEGER,
  ADD COLUMN IF NOT EXISTS reference_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS performed_by TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_transactions_receipt_token
  ON public.stock_transactions(receipt_token) WHERE receipt_token IS NOT NULL;

-- Room columns used by the existing 3D and emergency booking flows.
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS building_name TEXT,
  ADD COLUMN IF NOT EXISTS room_type TEXT,
  ADD COLUMN IF NOT EXISTS facilities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_disruption_id UUID,
  ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.rooms SET room_number = room_code WHERE room_number IS NULL;
UPDATE public.rooms SET room_type = category WHERE room_type IS NULL;
UPDATE public.rooms r SET building_name = b.name FROM public.buildings b
WHERE r.building_id = b.id AND r.building_name IS NULL;

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'relocated';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE room_status ADD VALUE IF NOT EXISTS 'disrupted';
ALTER TABLE public.room_bookings
  ADD COLUMN IF NOT EXISTS booking_date DATE,
  ADD COLUMN IF NOT EXISTS room_code TEXT,
  ADD COLUMN IF NOT EXISTS room_name TEXT,
  ADD COLUMN IF NOT EXISTS building_id TEXT REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS building_code TEXT,
  ADD COLUMN IF NOT EXISTS building_name TEXT,
  ADD COLUMN IF NOT EXISTS purpose TEXT,
  ADD COLUMN IF NOT EXISTS expected_attendance INTEGER,
  ADD COLUMN IF NOT EXISTS required_equipment TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS booked_by_role TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_request_id UUID REFERENCES public.approvals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approval_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_room_code TEXT,
  ADD COLUMN IF NOT EXISTS reallocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS reallocation_timestamp TIMESTAMPTZ;
UPDATE public.room_bookings rb SET room_code = r.room_code, room_name = r.name,
  building_id = r.building_id, building_name = COALESCE(r.building_name, b.name)
FROM public.rooms r LEFT JOIN public.buildings b ON b.id = r.building_id
WHERE rb.room_id = r.id AND rb.room_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_bookings_booking_code
  ON public.room_bookings(booking_code) WHERE booking_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_bookings_lookup
  ON public.room_bookings(room_id, start_time, end_time, status);

ALTER TABLE public.room_disruptions
  ADD COLUMN IF NOT EXISTS disruption_number TEXT,
  ADD COLUMN IF NOT EXISTS issue_description TEXT,
  ADD COLUMN IF NOT EXISTS reason_category TEXT,
  ADD COLUMN IF NOT EXISTS building_id TEXT REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reported_by_name TEXT,
  ADD COLUMN IF NOT EXISTS reported_by_role TEXT,
  ADD COLUMN IF NOT EXISTS related_incident_ticket TEXT,
  ADD COLUMN IF NOT EXISTS related_work_order_number TEXT,
  ADD COLUMN IF NOT EXISTS affected_booking_ids TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.room_disruptions SET issue_description = issue WHERE issue_description IS NULL;

-- Approval metadata required by the role-scoped API and SoD routine.
ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS review_remarks TEXT;

-- Phase 2.4 procurement ledger, aligned to the canonical inventory schema.
CREATE TABLE IF NOT EXISTS public.procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'pcs',
  estimated_unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_unit_cost >= 0),
  total_estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_estimated_cost >= 0),
  supplier_name TEXT NOT NULL DEFAULT 'Unverified supplier',
  supplier_contact TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('urgent','high','medium','normal')),
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('draft','pending_approval','approved','rejected','ordered','received')),
  reason TEXT NOT NULL,
  rule_trigger_reason TEXT,
  requested_by TEXT NOT NULL,
  requested_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by TEXT,
  approved_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES public.approvals(id) ON DELETE SET NULL,
  receipt_token TEXT UNIQUE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT procurement_no_self_approval CHECK (
    requested_by_user_id IS NULL OR approved_by_user_id IS NULL OR requested_by_user_id <> approved_by_user_id
  )
);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_status ON public.procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_procurement_requests_item ON public.procurement_requests(item_id);

CREATE TABLE IF NOT EXISTS public.work_order_part_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  order_number TEXT,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','issued','returned')),
  allocated_by TEXT NOT NULL,
  allocated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_order_part_allocations_order ON public.work_order_part_allocations(work_order_id);

ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_part_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS procurement_requests_scoped_read ON public.procurement_requests;
CREATE POLICY procurement_requests_scoped_read ON public.procurement_requests
  FOR SELECT TO authenticated USING (
    requested_by_user_id = auth.uid()
    OR public.has_role('procurement_approver', 'facilities_administrator', 'system_administrator')
    OR (public.has_role('department_manager') AND requested_by_user_id IN (
      SELECT p.id FROM public.profiles p WHERE p.department_id = public.current_user_department_id()
    ))
  );
DROP POLICY IF EXISTS work_order_parts_authorized_read ON public.work_order_part_allocations;
CREATE POLICY work_order_parts_authorized_read ON public.work_order_part_allocations
  FOR SELECT TO authenticated USING (
    public.has_role('technician','department_manager','facilities_administrator','procurement_approver','system_administrator')
  );

-- Transactional inventory mutation: row lock, stock update, and ledger insert are one commit.
CREATE OR REPLACE FUNCTION public.campusops_apply_stock_movement(
  p_sku TEXT,
  p_quantity INTEGER,
  p_movement TEXT,
  p_receipt_token TEXT DEFAULT NULL,
  p_work_order_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_name TEXT DEFAULT 'Campus Operations'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_item public.inventory_items%ROWTYPE;
  v_tx public.stock_transactions%ROWTYPE;
  v_before INTEGER;
  v_after INTEGER;
  v_delta INTEGER;
  v_type TEXT;
  v_status public.reorder_status;
BEGIN
  IF p_movement NOT IN ('allocation','receipt') THEN
    RAISE EXCEPTION 'Invalid stock movement type.' USING ERRCODE = '22023';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer.' USING ERRCODE = '22023';
  END IF;
  IF p_movement = 'receipt' AND NULLIF(BTRIM(p_receipt_token),'') IS NULL THEN
    RAISE EXCEPTION 'Receipt token is required.' USING ERRCODE = '22023';
  END IF;
  IF p_receipt_token IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_receipt_token)::BIGINT);
    SELECT * INTO v_tx FROM public.stock_transactions WHERE receipt_token = p_receipt_token LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('success', TRUE, 'isIdempotentReplay', TRUE,
        'receiptToken', p_receipt_token, 'itemId', v_tx.item_id, 'transaction', to_jsonb(v_tx));
    END IF;
  END IF;

  SELECT * INTO v_item FROM public.inventory_items
  WHERE LOWER(sku) = LOWER(p_sku) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item with SKU % was not found.', p_sku USING ERRCODE = 'P0002';
  END IF;

  v_before := v_item.current_stock;
  v_delta := CASE WHEN p_movement = 'allocation' THEN -p_quantity ELSE p_quantity END;
  v_after := v_before + v_delta;
  IF v_after < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Available %, requested %.', v_before, p_quantity USING ERRCODE = 'P0001';
  END IF;
  v_type := CASE WHEN p_movement = 'allocation' THEN 'allocation' ELSE 'receipt' END;
  v_status := CASE WHEN v_after <= v_item.min_threshold THEN 'critical'::public.reorder_status ELSE 'optimal'::public.reorder_status END;

  UPDATE public.inventory_items SET current_stock = v_after, reorder_status = v_status,
    status = CASE WHEN v_after = 0 THEN 'out_of_stock' WHEN v_after <= min_threshold THEN 'low_stock' ELSE 'in_stock' END,
    updated_at = NOW(), last_restocked_at = CASE WHEN p_movement = 'receipt' THEN NOW() ELSE last_restocked_at END
  WHERE id = v_item.id;

  INSERT INTO public.stock_transactions (
    item_id, work_order_id, transaction_type, quantity, balance_before, balance_after,
    receipt_token, actor_id, actor_name, created_at, item_sku, item_name, type,
    previous_stock, new_stock, reference_type, reference_id, reason, performed_by, user_id
  ) VALUES (
    v_item.id, p_work_order_id, v_type, v_delta, v_before, v_after,
    p_receipt_token, p_actor_id, COALESCE(NULLIF(p_actor_name,''),'Campus Operations'), NOW(),
    v_item.sku, v_item.item_name, v_type, v_before, v_after,
    CASE WHEN p_movement = 'allocation' THEN 'work_order' ELSE 'manual_adjustment' END,
    COALESCE(p_work_order_id::TEXT, p_receipt_token), p_movement, p_actor_name, p_actor_id
  ) RETURNING * INTO v_tx;

  RETURN jsonb_build_object(
    'success', TRUE, 'isIdempotentReplay', FALSE, 'item',
      jsonb_build_object('id',v_item.id,'sku',v_item.sku,'item_name',v_item.item_name,
        'current_stock',v_after,'min_threshold',v_item.min_threshold,'unit',v_item.unit,'reorder_status',v_status),
    'transaction', to_jsonb(v_tx), 'balanceBefore',v_before,'balanceAfter',v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_apply_stock_movement(TEXT,INTEGER,TEXT,TEXT,UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_apply_stock_movement(TEXT,INTEGER,TEXT,TEXT,UUID,UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.set_room_booking_compatibility_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.booking_date := COALESCE(NEW.booking_date, (NEW.start_time AT TIME ZONE 'UTC')::DATE);
  NEW.purpose := COALESCE(NEW.purpose, NEW.title);
  NEW.expected_attendance := COALESCE(NEW.expected_attendance, NEW.attendee_count);
  NEW.room_code := COALESCE(NEW.room_code, (SELECT r.room_code FROM public.rooms r WHERE r.id = NEW.room_id));
  NEW.room_name := COALESCE(NEW.room_name, (SELECT r.name FROM public.rooms r WHERE r.id = NEW.room_id));
  NEW.building_id := COALESCE(NEW.building_id, (SELECT r.building_id FROM public.rooms r WHERE r.id = NEW.room_id));
  NEW.building_name := COALESCE(NEW.building_name, (SELECT b.name FROM public.buildings b WHERE b.id = NEW.building_id));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_room_booking_compatibility_fields ON public.room_bookings;
CREATE TRIGGER trg_room_booking_compatibility_fields BEFORE INSERT OR UPDATE ON public.room_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_room_booking_compatibility_fields();

CREATE OR REPLACE FUNCTION public.campusops_create_room_booking(
  p_room_code TEXT,
  p_title TEXT,
  p_event_type TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_attendees INTEGER,
  p_booked_by UUID,
  p_booked_by_name TEXT,
  p_booked_by_role TEXT,
  p_department TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_booking public.room_bookings%ROWTYPE;
  v_approval public.approvals%ROWTYPE;
  v_code TEXT;
  v_requires_approval BOOLEAN;
BEGIN
  IF NULLIF(BTRIM(p_title),'') IS NULL OR p_end_time <= p_start_time OR p_attendees <= 0 THEN
    RAISE EXCEPTION 'Invalid booking details.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_room FROM public.rooms WHERE LOWER(room_code) = LOWER(p_room_code) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_room.status::TEXT IN ('maintenance','disrupted') THEN
    RAISE EXCEPTION 'Room is unavailable.' USING ERRCODE = '23514';
  END IF;
  IF p_attendees > v_room.capacity THEN RAISE EXCEPTION 'Room capacity exceeded.' USING ERRCODE = '23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.room_disruptions d WHERE d.room_id=v_room.id AND d.status='active') THEN
    RAISE EXCEPTION 'Room has an active disruption.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.room_bookings b WHERE b.room_id=v_room.id
      AND b.status::TEXT NOT IN ('cancelled','relocated','rejected','disrupted')
      AND b.start_time < p_end_time AND b.end_time > p_start_time) THEN
    RAISE EXCEPTION 'Room has a booking conflict.' USING ERRCODE = '23P01';
  END IF;

  v_requires_approval := p_attendees >= 80 OR LOWER(COALESCE(v_room.room_type,v_room.category::TEXT)) = 'auditorium';
  v_code := 'BK-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(FLOOR(RANDOM()*900+100)::TEXT,3,'0');
  INSERT INTO public.room_bookings(
    room_id,booking_code,room_code,room_name,building_id,building_name,title,purpose,event_type,
    start_time,end_time,booking_date,attendee_count,expected_attendance,booked_by,organizer_id,
    organizer_name,booked_by_role,department,requires_approval,status
  ) VALUES (
    v_room.id,v_code,v_room.room_code,v_room.name,v_room.building_id,COALESCE(v_room.building_name,'Campus'),
    p_title,p_title,p_event_type,p_start_time,p_end_time,(p_start_time AT TIME ZONE 'UTC')::DATE,
    p_attendees,p_attendees,p_booked_by,p_booked_by,p_booked_by_name,p_booked_by_role,p_department,
    v_requires_approval,CASE WHEN v_requires_approval THEN 'tentative'::booking_status ELSE 'confirmed'::booking_status END
  ) RETURNING * INTO v_booking;

  IF v_requires_approval THEN
    INSERT INTO public.approvals(
      title,category,reason,estimated_cost,urgency,status,requester_id,requester_name,requester_role,
      department_name,request_type,entity_id,created_at,updated_at
    ) VALUES (
      'Room Reservation: ' || v_room.name || ' (' || v_code || ')','Room Reservation',
      'Booking request for ' || p_title || ' with ' || p_attendees || ' attendees.',0,'medium','pending',
      p_booked_by,p_booked_by_name,p_booked_by_role,COALESCE(p_department,'Operations'),'room_booking',v_booking.id::TEXT,NOW(),NOW()
    ) RETURNING * INTO v_approval;
    UPDATE public.room_bookings SET approval_request_id=v_approval.id WHERE id=v_booking.id RETURNING * INTO v_booking;
  END IF;
  RETURN jsonb_build_object('success',TRUE,'booking',to_jsonb(v_booking),
    'approval',CASE WHEN v_requires_approval THEN to_jsonb(v_approval) ELSE NULL END,
    'source','supabase_postgres');
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_create_room_booking(TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_create_room_booking(TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,UUID,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.campusops_review_room_booking(
  p_booking_id UUID,
  p_status TEXT,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_actor_role TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_booking public.room_bookings%ROWTYPE; v_role TEXT;
BEGIN
  v_role := public.normalize_role_name(p_actor_role);
  IF p_status NOT IN ('approved','rejected','cancelled') THEN RAISE EXCEPTION 'Invalid booking status.' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_booking FROM public.room_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE='P0002'; END IF;
  IF p_status IN ('approved','rejected') THEN
    IF v_role NOT IN ('facilities_administrator','department_manager') THEN RAISE EXCEPTION 'Not authorized to review bookings.' USING ERRCODE='42501'; END IF;
    IF v_booking.status::TEXT <> 'tentative' THEN RAISE EXCEPTION 'Only pending bookings can be reviewed.' USING ERRCODE='23514'; END IF;
    IF v_booking.booked_by IS NOT NULL AND v_booking.booked_by=p_actor_id THEN RAISE EXCEPTION 'Self-approval is prohibited.' USING ERRCODE='42501'; END IF;
  ELSIF p_actor_id IS DISTINCT FROM v_booking.booked_by AND p_actor_id IS DISTINCT FROM v_booking.organizer_id
      AND v_role NOT IN ('facilities_administrator','department_manager') THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking.' USING ERRCODE='42501';
  END IF;

  UPDATE public.room_bookings SET
    status = CASE p_status WHEN 'approved' THEN 'confirmed'::booking_status WHEN 'rejected' THEN 'rejected'::booking_status ELSE 'cancelled'::booking_status END,
    approved_by = CASE WHEN p_status='approved' THEN p_actor_name ELSE approved_by END,
    approval_timestamp = CASE WHEN p_status IN ('approved','rejected') THEN NOW() ELSE approval_timestamp END,
    reallocation_reason = CASE WHEN p_status IN ('rejected','cancelled') THEN COALESCE(NULLIF(BTRIM(p_reason),''), CASE WHEN p_status='rejected' THEN 'Booking request declined' ELSE 'Cancelled by requester' END) ELSE reallocation_reason END
  WHERE id=p_booking_id RETURNING * INTO v_booking;
  IF v_booking.approval_request_id IS NOT NULL AND p_status IN ('approved','rejected') THEN
    UPDATE public.approvals SET status=p_status::approval_status, reviewer_id=p_actor_id,
      reviewer_name=p_actor_name, reviewed_at=NOW(), review_remarks=p_reason, updated_at=NOW()
    WHERE id=v_booking.approval_request_id;
  END IF;
  RETURN to_jsonb(v_booking);
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_review_room_booking(UUID,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_review_room_booking(UUID,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.campusops_create_procurement_request(
  p_item_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_urgency TEXT,
  p_requested_by_id UUID,
  p_requested_by TEXT,
  p_requested_by_role TEXT,
  p_department TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_item public.inventory_items%ROWTYPE; v_request public.procurement_requests%ROWTYPE; v_approval public.approvals%ROWTYPE;
BEGIN
  IF p_quantity IS NULL OR p_quantity<=0 OR NULLIF(BTRIM(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Quantity and justification are required.' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_item FROM public.inventory_items WHERE id=p_item_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found.' USING ERRCODE='P0002'; END IF;
  IF p_urgency NOT IN ('urgent','high','medium','normal') THEN RAISE EXCEPTION 'Invalid urgency.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.procurement_requests(
    request_number,item_id,item_sku,item_name,category,quantity,unit,estimated_unit_cost,total_estimated_cost,
    supplier_name,supplier_contact,urgency,status,reason,rule_trigger_reason,requested_by,requested_by_user_id
  ) VALUES (
    'REQ-'||TO_CHAR(NOW(),'YYYYMMDD')||'-'||UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT,'-',''),1,8)),
    v_item.id,v_item.sku,v_item.item_name,v_item.category,p_quantity,v_item.unit,COALESCE(v_item.unit_cost,0),
    COALESCE(v_item.unit_cost,0)*p_quantity,COALESCE(v_item.supplier_name,'Unverified supplier'),v_item.supplier_contact,
    p_urgency,'pending_approval',BTRIM(p_reason),
    FORMAT('Stock: %s %s; minimum threshold: %s %s.',v_item.current_stock,v_item.unit,v_item.min_threshold,v_item.unit),
    p_requested_by,p_requested_by_id
  ) RETURNING * INTO v_request;
  INSERT INTO public.approvals(
    title,category,reason,estimated_cost,urgency,status,requester_id,requester_name,requester_role,
    department_name,request_type,entity_id,created_at,updated_at
  ) VALUES (
    v_request.request_number||': Requisition for '||v_request.quantity||'x '||v_request.item_name,
    'Procurement',BTRIM(p_reason),v_request.total_estimated_cost,
    CASE WHEN p_urgency='urgent' THEN 'high'::urgency_level ELSE p_urgency::urgency_level END,
    'pending',p_requested_by_id,p_requested_by,p_requested_by_role,COALESCE(p_department,'Operations'),
    'procurement',v_request.id::TEXT,NOW(),NOW()
  ) RETURNING * INTO v_approval;
  UPDATE public.procurement_requests SET approval_id=v_approval.id WHERE id=v_request.id RETURNING * INTO v_request;
  RETURN jsonb_build_object('request',to_jsonb(v_request),'approval',to_jsonb(v_approval));
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_create_procurement_request(UUID,INTEGER,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_create_procurement_request(UUID,INTEGER,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.campusops_update_procurement_request(
  p_request_id UUID,
  p_status TEXT,
  p_receipt_token TEXT,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_actor_role TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_request public.procurement_requests%ROWTYPE; v_stock JSONB; v_role TEXT;
BEGIN
  v_role := public.normalize_role_name(p_actor_role);
  IF v_role <> 'procurement_approver' THEN RAISE EXCEPTION 'Only Procurement Approvers may update requisitions.' USING ERRCODE='42501'; END IF;
  IF p_status NOT IN ('approved','rejected','ordered','received') THEN RAISE EXCEPTION 'Invalid requisition status.' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_request FROM public.procurement_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Requisition not found.' USING ERRCODE='P0002'; END IF;
  IF p_status IN ('approved','rejected') THEN
    IF v_request.status<>'pending_approval' THEN RAISE EXCEPTION 'Only pending requisitions can be reviewed.' USING ERRCODE='23514'; END IF;
    IF v_request.requested_by_user_id IS NOT NULL AND v_request.requested_by_user_id=p_actor_id THEN RAISE EXCEPTION 'Self-approval is prohibited.' USING ERRCODE='42501'; END IF;
    UPDATE public.procurement_requests SET status=p_status, approved_by=CASE WHEN p_status='approved' THEN p_actor_name ELSE approved_by END,
      approved_by_user_id=CASE WHEN p_status='approved' THEN p_actor_id ELSE approved_by_user_id END, updated_at=NOW()
      WHERE id=p_request_id RETURNING * INTO v_request;
    UPDATE public.approvals SET status=p_status::approval_status, reviewer_id=p_actor_id, reviewer_name=p_actor_name,
      reviewed_at=NOW(), updated_at=NOW() WHERE id=v_request.approval_id;
  ELSIF p_status='ordered' THEN
    IF v_request.status<>'approved' THEN RAISE EXCEPTION 'Only approved requisitions can be ordered.' USING ERRCODE='23514'; END IF;
    UPDATE public.procurement_requests SET status='ordered',ordered_at=NOW(),updated_at=NOW() WHERE id=p_request_id RETURNING * INTO v_request;
  ELSE
    IF v_request.status='received' AND v_request.receipt_token=p_receipt_token THEN
      RETURN jsonb_build_object('request',to_jsonb(v_request),'isIdempotentReplay',TRUE);
    END IF;
    IF v_request.status<>'ordered' THEN RAISE EXCEPTION 'Only ordered requisitions can be received.' USING ERRCODE='23514'; END IF;
    IF NULLIF(BTRIM(p_receipt_token),'') IS NULL THEN RAISE EXCEPTION 'Receipt token is required.' USING ERRCODE='22023'; END IF;
    v_stock := public.campusops_apply_stock_movement(v_request.item_sku,v_request.quantity,'receipt',p_receipt_token,NULL,p_actor_id,p_actor_name);
    UPDATE public.procurement_requests SET status='received',receipt_token=p_receipt_token,received_at=NOW(),updated_at=NOW()
      WHERE id=p_request_id RETURNING * INTO v_request;
  END IF;
  RETURN jsonb_build_object('request',to_jsonb(v_request),'stock',v_stock,'isIdempotentReplay',FALSE);
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_update_procurement_request(UUID,TEXT,TEXT,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_update_procurement_request(UUID,TEXT,TEXT,UUID,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.campusops_report_room_disruption(
  p_room_id UUID,
  p_issue TEXT,
  p_reason_category TEXT,
  p_severity TEXT,
  p_resolution_eta TEXT,
  p_reporter_id UUID,
  p_reporter_name TEXT,
  p_reporter_role TEXT,
  p_incident_ticket TEXT DEFAULT NULL,
  p_work_order_number TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_disruption public.room_disruptions%ROWTYPE;
  v_booking_ids TEXT[];
  v_number TEXT;
BEGIN
  IF NULLIF(BTRIM(p_issue),'') IS NULL THEN RAISE EXCEPTION 'Issue description is required.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002'; END IF;
  SELECT COALESCE(array_agg(id::TEXT),ARRAY[]::TEXT[]) INTO v_booking_ids
    FROM public.room_bookings WHERE room_id = v_room.id AND status::TEXT NOT IN ('cancelled','relocated');
  v_number := 'DIS-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(FLOOR(RANDOM()*90+10)::TEXT,2,'0');
  INSERT INTO public.room_disruptions(
    disruption_number,room_id,room_code,building_id,building_name,issue,issue_description,
    reason_category,severity,affected_schedule,status,resolution_eta,reported_by,reported_by_name,reported_by_role,
    related_incident_ticket,related_work_order_number,affected_booking_ids,created_at
  ) VALUES (
    v_number,v_room.id,v_room.room_code,v_room.building_id,COALESCE(v_room.building_name,'Campus'),
    BTRIM(p_issue),BTRIM(p_issue),p_reason_category,p_severity,
    CASE WHEN CARDINALITY(v_booking_ids)>0 THEN CARDINALITY(v_booking_ids)::TEXT || ' scheduled booking(s) affected' ELSE 'No scheduled sessions currently affected' END,
    'active',COALESCE(NULLIF(BTRIM(p_resolution_eta),''),'Investigating'),p_reporter_id,
    p_reporter_name,p_reporter_role,p_incident_ticket,p_work_order_number,v_booking_ids,NOW()
  ) RETURNING * INTO v_disruption;
  UPDATE public.rooms SET status = 'disrupted', active_disruption_id = v_disruption.id WHERE id = v_room.id;
  RETURN jsonb_build_object('success',TRUE,'disruption',to_jsonb(v_disruption),'affected_booking_ids',v_booking_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_report_room_disruption(UUID,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_report_room_disruption(UUID,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS public.room_reallocations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.room_bookings(id) ON DELETE CASCADE,
  booking_number TEXT,
  original_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  original_room_name TEXT,
  new_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  new_room_name TEXT,
  reason TEXT NOT NULL,
  authorized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  authorized_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_room_reallocations_booking ON public.room_reallocations_log(booking_id, created_at DESC);
ALTER TABLE public.room_reallocations_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_reallocation_log_authorized_read ON public.room_reallocations_log;
CREATE POLICY room_reallocation_log_authorized_read ON public.room_reallocations_log
  FOR SELECT TO authenticated USING (
    public.has_role('department_manager','facilities_administrator','system_administrator')
  );

CREATE OR REPLACE FUNCTION public.campusops_reallocate_booking(
  p_disruption_id UUID,
  p_booking_id UUID,
  p_target_room_code TEXT,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_actor_role TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_disruption public.room_disruptions%ROWTYPE;
  v_booking public.room_bookings%ROWTYPE;
  v_target public.rooms%ROWTYPE;
  v_conflict_id UUID;
  v_reason TEXT;
BEGIN
  SELECT * INTO v_disruption FROM public.room_disruptions WHERE id = p_disruption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disruption not found.' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_booking FROM public.room_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_target FROM public.rooms WHERE LOWER(room_code) = LOWER(p_target_room_code) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target room not found.' USING ERRCODE = 'P0002'; END IF;
  IF v_target.status::TEXT IN ('disrupted','maintenance') THEN
    RAISE EXCEPTION 'Target room is unavailable.' USING ERRCODE = '23514';
  END IF;
  IF COALESCE(v_booking.expected_attendance,v_booking.attendee_count,0) > v_target.capacity THEN
    RAISE EXCEPTION 'Target room capacity is insufficient.' USING ERRCODE = '23514';
  END IF;
  SELECT id INTO v_conflict_id FROM public.room_bookings
    WHERE room_id = v_target.id AND id <> v_booking.id
      AND status::TEXT NOT IN ('cancelled','relocated','rejected','disrupted')
      AND start_time < v_booking.end_time AND end_time > v_booking.start_time
    LIMIT 1;
  IF v_conflict_id IS NOT NULL THEN RAISE EXCEPTION 'Target room has a booking conflict.' USING ERRCODE = '23P01'; END IF;

  v_reason := COALESCE(NULLIF(BTRIM(p_reason),''),v_disruption.issue_description,v_disruption.issue,'Emergency reallocation');
  UPDATE public.room_bookings SET
    original_room_code = COALESCE(original_room_code,room_code),
    room_id = v_target.id, room_code = v_target.room_code, room_name = v_target.name,
    building_id = v_target.building_id,
    building_name = COALESCE(v_target.building_name,building_name),
    status = 'relocated', reallocation_reason = v_reason,
    reallocation_timestamp = NOW(), approved_by = p_actor_name, approval_timestamp = NOW()
  WHERE id = v_booking.id;
  UPDATE public.room_disruptions SET status = 'mitigated', alternative_room_id = v_target.id,
    alternative_room_name = v_target.name WHERE id = v_disruption.id;
  INSERT INTO public.room_reallocations_log(
    booking_id,booking_number,original_room_id,original_room_name,new_room_id,new_room_name,
    reason,authorized_by,authorized_role
  ) VALUES (
    v_booking.id,COALESCE(v_booking.booking_code,v_booking.id::TEXT),v_booking.room_id,
    COALESCE(v_booking.room_name,v_booking.title),v_target.id,v_target.name,
    v_reason,p_actor_id,p_actor_role
  );
  RETURN jsonb_build_object('success',TRUE,'booking_id',v_booking.id,'disruption_id',v_disruption.id,
    'target_room_id',v_target.id,'target_room_code',v_target.room_code,'authorized_by',p_actor_name,
    'authorized_role',p_actor_role,'approved_at',NOW());
END;
$$;
REVOKE ALL ON FUNCTION public.campusops_reallocate_booking(UUID,UUID,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campusops_reallocate_booking(UUID,UUID,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;

-- Replace the campus-specific sample label with fictional demo data.
UPDATE public.buildings SET name = 'Design & Innovation Center'
WHERE id = 'architecture-block' AND name ILIKE '%MNM%';

COMMIT;
