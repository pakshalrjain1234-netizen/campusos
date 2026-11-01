-- ==============================================================================
-- CAMPUSOPS — MIGRATION 007: ROLE RESOLUTION & TRANSACTIONAL PERSISTENCE RPCs
-- Fixes current_app_role() alias and provides transactional database functions
-- for atomic stock allocation, idempotent goods receipt, and room reservation
-- ==============================================================================

-- 1. Resolve Function Inconsistency: Alias public.current_app_role() to public.current_user_role()
-- Migrations 004 & 005 call public.current_app_role(), while 002 defined public.current_user_role().
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.current_user_role();
$$;

REVOKE EXECUTE ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated, service_role;

-- 2. Enhanced Atomic Stock Allocation Procedure with Ledger Insertion
-- Atomically decrements stock and creates an immutable stock_transactions record
CREATE OR REPLACE FUNCTION public.allocate_stock_to_work_order(
    p_item_id UUID,
    p_work_order_id UUID,
    p_quantity INTEGER,
    p_actor_id UUID DEFAULT NULL,
    p_actor_name TEXT DEFAULT 'Technician'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_item RECORD;
    v_new_stock INTEGER;
    v_new_status reorder_status;
    v_tx_id UUID;
    v_caller_role app_role;
BEGIN
    -- Authorization check
    IF auth.uid() IS NOT NULL THEN
        v_caller_role := public.current_user_role();
        IF v_caller_role NOT IN ('coo', 'director', 'engineer') THEN
            RAISE EXCEPTION 'Access denied: role % cannot allocate inventory stock.', v_caller_role;
        END IF;
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Allocation quantity must be greater than zero.';
    END IF;

    -- Lock the inventory row for update
    SELECT * INTO v_item 
    FROM public.inventory_items 
    WHERE id = p_item_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item % does not exist.', p_item_id;
    END IF;

    -- Negative stock prevention
    IF v_item.current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %.',
            v_item.item_name, v_item.current_stock, p_quantity;
    END IF;

    v_new_stock := v_item.current_stock - p_quantity;

    -- Determine new reorder status
    IF v_new_stock = 0 THEN
        v_new_status := 'critical';
    ELSIF v_new_stock <= v_item.min_threshold THEN
        v_new_status := 'critical';
    ELSE
        v_new_status := v_item.reorder_status;
    END IF;

    -- Update inventory item
    UPDATE public.inventory_items
    SET current_stock = v_new_stock,
        reorder_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_item_id;

    -- Create immutable stock transaction record
    INSERT INTO public.stock_transactions (
        item_id,
        work_order_id,
        transaction_type,
        quantity,
        balance_before,
        balance_after,
        actor_id,
        actor_name,
        created_at
    ) VALUES (
        p_item_id,
        p_work_order_id,
        'allocation',
        -p_quantity,
        v_item.current_stock,
        v_new_stock,
        COALESCE(p_actor_id, auth.uid()),
        p_actor_name,
        NOW()
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'item_id', p_item_id,
        'item_name', v_item.item_name,
        'quantity_allocated', p_quantity,
        'balance_before', v_item.current_stock,
        'balance_after', v_new_stock,
        'reorder_status', v_new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.allocate_stock_to_work_order(UUID, UUID, INTEGER, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_stock_to_work_order(UUID, UUID, INTEGER, UUID, TEXT) TO authenticated, service_role;

-- 3. Idempotent Goods Receipt Procedure with Replay Protection
CREATE OR REPLACE FUNCTION public.receive_goods_idempotent(
    p_item_id UUID,
    p_quantity INTEGER,
    p_receipt_token TEXT,
    p_purchase_order_id UUID DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_actor_name TEXT DEFAULT 'Receiving Stores'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_item RECORD;
    v_new_stock INTEGER;
    v_new_status reorder_status;
    v_existing_tx RECORD;
    v_tx_id UUID;
    v_caller_role app_role;
BEGIN
    -- Authorization check
    IF auth.uid() IS NOT NULL THEN
        v_caller_role := public.current_user_role();
        IF v_caller_role NOT IN ('coo', 'director', 'engineer') THEN
            RAISE EXCEPTION 'Access denied: role % cannot record goods receipt.', v_caller_role;
        END IF;
    END IF;

    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Receipt quantity must be greater than zero.';
    END IF;

    -- Idempotency check: token already registered?
    SELECT * INTO v_existing_tx
    FROM public.stock_transactions
    WHERE receipt_token = p_receipt_token;

    IF FOUND THEN
        -- Replay detected: return existing receipt safely without modifying stock
        RETURN jsonb_build_object(
            'success', true,
            'is_idempotent_replay', true,
            'transaction_id', v_existing_tx.id,
            'message', 'Goods receipt already recorded. Stock was not duplicated.',
            'receipt_token', p_receipt_token
        );
    END IF;

    -- Lock inventory row for update
    SELECT * INTO v_item 
    FROM public.inventory_items 
    WHERE id = p_item_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item % does not exist.', p_item_id;
    END IF;

    v_new_stock := v_item.current_stock + p_quantity;

    IF v_new_stock > v_item.min_threshold THEN
        v_new_status := 'optimal';
    ELSE
        v_new_status := v_item.reorder_status;
    END IF;

    UPDATE public.inventory_items
    SET current_stock = v_new_stock,
        reorder_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_item_id;

    INSERT INTO public.stock_transactions (
        item_id,
        transaction_type,
        quantity,
        balance_before,
        balance_after,
        receipt_token,
        actor_id,
        actor_name,
        created_at
    ) VALUES (
        p_item_id,
        'receipt',
        p_quantity,
        v_item.current_stock,
        v_new_stock,
        p_receipt_token,
        COALESCE(p_actor_id, auth.uid()),
        p_actor_name,
        NOW()
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_idempotent_replay', false,
        'transaction_id', v_tx_id,
        'receipt_token', p_receipt_token,
        'quantity_received', p_quantity,
        'balance_before', v_item.current_stock,
        'balance_after', v_new_stock,
        'reorder_status', v_new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.receive_goods_idempotent(UUID, INTEGER, TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_goods_idempotent(UUID, INTEGER, TEXT, UUID, UUID, TEXT) TO authenticated, service_role;

-- 4. Atomic Room Booking Procedure with Maintenance & Conflict Exclusion
-- Ensure schema compatibility with room_bookings table
ALTER TABLE public.room_bookings
    ADD COLUMN IF NOT EXISTS booking_code VARCHAR(30),
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(30) DEFAULT 'lecture',
    ADD COLUMN IF NOT EXISTS booked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_room_booking_safe(
    p_room_id UUID,
    p_title TEXT,
    p_event_type TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_attendees INTEGER,
    p_booked_by UUID,
    p_booked_by_name TEXT,
    p_booked_by_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_room RECORD;
    v_conflict RECORD;
    v_disruption RECORD;
    v_booking_id UUID;
    v_booking_code TEXT;
BEGIN
    IF p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'End time must be after start time.';
    END IF;

    -- Lock room row
    SELECT * INTO v_room 
    FROM public.rooms 
    WHERE id = p_room_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room % does not exist.', p_room_id;
    END IF;

    -- Maintenance exclusion check (room_status enum defines 'maintenance')
    IF v_room.status = 'maintenance' THEN
        RAISE EXCEPTION 'Room "%" is currently under maintenance. New bookings are blocked.', v_room.name;
    END IF;

    SELECT * INTO v_disruption
    FROM public.room_disruptions
    WHERE room_id = p_room_id 
      AND status = 'active'
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Active facility disruption in room "%" (%). New bookings are blocked.',
            v_room.name, v_disruption.issue;
    END IF;

    -- Double-booking interval overlap check
    SELECT * INTO v_conflict
    FROM public.room_bookings
    WHERE room_id = p_room_id
      AND status NOT IN ('cancelled', 'relocated')
      AND (p_start_time < end_time AND p_end_time > start_time)
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Schedule conflict: Room is already booked for "%" between % and %.',
            v_conflict.title, v_conflict.start_time, v_conflict.end_time;
    END IF;

    v_booking_code := 'BK-' || LPAD(FLOOR(RANDOM() * 900 + 100)::TEXT, 3, '0');

    INSERT INTO public.room_bookings (
        booking_code,
        room_id,
        booked_by,
        title,
        event_type,
        start_time,
        end_time,
        attendee_count,
        status,
        created_at
    ) VALUES (
        v_booking_code,
        p_room_id,
        p_booked_by,
        p_title,
        p_event_type,
        p_start_time,
        p_end_time,
        p_attendees,
        'confirmed',
        NOW()
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'booking_code', v_booking_code,
        'room_id', p_room_id,
        'room_name', v_room.name,
        'start_time', p_start_time,
        'end_time', p_end_time,
        'status', 'confirmed'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_room_booking_safe(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_room_booking_safe(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID, TEXT, TEXT) TO authenticated, service_role;

