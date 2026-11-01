-- =====================================================================
-- CAMPUSOPS — MIGRATION 001: INITIAL RELATIONAL SCHEMA
-- Phase 2 Backend Foundation — Revised Post-Security Audit
-- =====================================================================

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Enumerated Types
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM (
        'coo',
        'director',
        'engineer',
        'liaison'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_category AS ENUM (
        'Electrical',
        'Plumbing',
        'HVAC',
        'Structural',
        'IT / Network',
        'Safety',
        'General'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'open',
        'in_progress',
        'investigating',
        'resolved',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM (
        'urgent',
        'high',
        'medium',
        'low'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE work_order_status AS ENUM (
        'unassigned',
        'in_progress',
        'awaiting_parts',
        'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reorder_status AS ENUM (
        'optimal',
        'critical',
        'reordered',
        'pending_approval'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'confirmed',
        'tentative',
        'cancelled',
        'disrupted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE disruption_status AS ENUM (
        'active',
        'mitigated',
        'resolved'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_status AS ENUM (
        'pending',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level AS ENUM (
        'high',
        'medium',
        'normal'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE building_category AS ENUM (
        'Academic',
        'Administrative',
        'Residential',
        'Facility'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM (
        'available',
        'occupied',
        'maintenance',
        'disrupted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE insight_type AS ENUM (
        'repeated-complaint',
        'maintenance-risk',
        'low-stock',
        'room-conflict'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Utility Trigger: Auto-update updated_at timestamp (with pinned search_path)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 4. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code VARCHAR(15) NOT NULL UNIQUE,
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'liaison',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    avatar_url TEXT,
    phone VARCHAR(25),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Automatic profile creation on auth.users registration (safe default role only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'liaison'::app_role, -- Strictly assign default role; client metadata role is untrusted
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Database-level role immutability trigger (defense-in-depth against role escalation)
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_role app_role;
BEGIN
    IF NEW.role != OLD.role THEN
        SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
        -- Allow only COO or background superuser/service-role to update assigned roles
        IF auth.uid() IS NOT NULL AND (v_caller_role IS NULL OR v_caller_role != 'coo') THEN
            RAISE EXCEPTION 'Privilege escalation rejected: only the Chief Operations Officer can modify assigned roles.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_role_change();

-- Safe Initial COO Bootstrap Function (One-time bootstrap, enforces role integrity)
CREATE OR REPLACE FUNCTION public.bootstrap_initial_coo(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_id UUID;
BEGIN
    -- Reject if an active COO already exists in profiles
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'coo' AND is_active = TRUE) THEN
        RAISE EXCEPTION 'A Chief Operations Officer is already established. Role changes must be performed by the active COO.';
    END IF;

    SELECT id INTO v_target_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(p_email)) AND is_active = TRUE;
    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'User profile with email "%" not found. The user must register before promotion.', p_email;
    END IF;

    UPDATE public.profiles
    SET role = 'coo', updated_at = NOW()
    WHERE id = v_target_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'email', p_email,
        'assigned_role', 'coo'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_initial_coo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_coo(TEXT) TO authenticated, service_role;

-- 6. Buildings Table (Preserving Phase 1 IDs and 3D Coordinates)
CREATE TABLE IF NOT EXISTS public.buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    code VARCHAR(15) NOT NULL UNIQUE,
    category building_category NOT NULL DEFAULT 'Academic',
    floors VARCHAR(20) NOT NULL DEFAULT 'G+1',
    health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    position_x FLOAT NOT NULL DEFAULT 0.0,
    position_y FLOAT NOT NULL DEFAULT 0.0,
    position_z FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_buildings_updated_at
    BEFORE UPDATE ON public.buildings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    room_code VARCHAR(30) NOT NULL,
    name TEXT NOT NULL,
    floor VARCHAR(20) NOT NULL DEFAULT 'Ground Floor',
    capacity INTEGER CHECK (capacity > 0),
    category VARCHAR(50) NOT NULL DEFAULT 'Lecture Hall',
    status room_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_building_room_code UNIQUE (building_id, room_code)
);

CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Incidents Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(25) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category incident_category NOT NULL DEFAULT 'General',
    severity incident_severity NOT NULL DEFAULT 'medium',
    status incident_status NOT NULL DEFAULT 'open',
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    floor VARCHAR(30),
    room_text VARCHAR(60),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_name TEXT NOT NULL,
    reporter_role TEXT NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_name TEXT,
    sla_deadline TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Work Orders Table
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(25) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    priority priority_level NOT NULL DEFAULT 'medium',
    status work_order_status NOT NULL DEFAULT 'unassigned',
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    location_details TEXT,
    assigned_engineer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_engineer_name TEXT,
    assigned_engineer_avatar TEXT,
    due_date TIMESTAMPTZ,
    sla_remaining VARCHAR(30),
    completion_rate INTEGER NOT NULL DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
    attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_work_orders_updated_at
    BEFORE UPDATE ON public.work_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Inventory Items Table (with strict non-negative stock constraint)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(60) NOT NULL UNIQUE,
    item_name TEXT NOT NULL,
    category VARCHAR(60) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_threshold INTEGER NOT NULL DEFAULT 5 CHECK (min_threshold >= 0),
    unit VARCHAR(25) NOT NULL DEFAULT 'units',
    location TEXT NOT NULL,
    reorder_status reorder_status NOT NULL DEFAULT 'optimal',
    lead_time_days INTEGER NOT NULL DEFAULT 3 CHECK (lead_time_days >= 0),
    unit_cost NUMERIC(10, 2) CHECK (unit_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic inventory deduction/restock procedure (prevents race conditions with row locking)
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_item_id UUID,
    p_delta INTEGER,
    p_reason TEXT DEFAULT 'Operational allocation'
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
BEGIN
    -- Acquire exclusive row-level lock
    SELECT * INTO v_item FROM public.inventory_items WHERE id = p_item_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item with ID % does not exist.', p_item_id;
    END IF;

    -- Enforce caller role: authenticated caller must be engineer, director or coo
    IF auth.uid() IS NOT NULL THEN
        IF (SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE) NOT IN ('coo', 'director', 'engineer') THEN
            RAISE EXCEPTION 'Access denied: only Engineers and Operations Managers can adjust inventory stock.';
        END IF;
    END IF;
    
    v_new_stock := v_item.current_stock + p_delta;
    
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested deduction: %.',
            v_item.item_name, v_item.current_stock, ABS(p_delta);
    END IF;
    
    -- Dynamically update reorder status based on new stock level
    IF v_new_stock = 0 THEN
        v_new_status := 'critical';
    ELSIF v_new_stock <= v_item.min_threshold THEN
        v_new_status := CASE WHEN v_item.reorder_status = 'reordered' THEN 'reordered' ELSE 'critical' END;
    ELSE
        v_new_status := 'optimal';
    END IF;
    
    UPDATE public.inventory_items
    SET current_stock = v_new_stock,
        reorder_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_item_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'item_id', p_item_id,
        'item_name', v_item.item_name,
        'old_stock', v_item.current_stock,
        'new_stock', v_new_stock,
        'reorder_status', v_new_status
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_inventory_stock(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_stock(UUID, INTEGER, TEXT) TO authenticated, service_role;

-- 11. Work Order Parts Table
CREATE TABLE IF NOT EXISTS public.work_order_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'needed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Room Bookings Table (with overlap prevention constraint & valid timeframe)
CREATE TABLE IF NOT EXISTS public.room_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organizer_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status booking_status NOT NULL DEFAULT 'confirmed',
    attendee_count INTEGER CHECK (attendee_count > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce end_time after start_time
    CONSTRAINT chk_booking_time_valid CHECK (end_time > start_time),
    -- Database-level exclusion constraint preventing overlapping confirmed bookings for the same room
    CONSTRAINT no_overlapping_confirmed_bookings EXCLUDE USING gist (
        room_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status = 'confirmed')
);

CREATE TRIGGER trg_room_bookings_updated_at
    BEFORE UPDATE ON public.room_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Room Disruptions Table
CREATE TABLE IF NOT EXISTS public.room_disruptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    room_code VARCHAR(30) NOT NULL,
    building_name TEXT NOT NULL,
    issue TEXT NOT NULL,
    affected_schedule TEXT,
    status disruption_status NOT NULL DEFAULT 'active',
    alternative_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    alternative_room_name TEXT,
    resolution_eta VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 14. Approvals Table (Self-approval prevention enforced)
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    reason TEXT NOT NULL,
    estimated_cost NUMERIC(12, 2) NOT NULL CHECK (estimated_cost >= 0),
    urgency urgency_level NOT NULL DEFAULT 'medium',
    status approval_status NOT NULL DEFAULT 'pending',
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    requester_role TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    department_name TEXT NOT NULL,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce that a user cannot approve their own request
    CONSTRAINT chk_no_self_approval CHECK (
        reviewer_id IS NULL OR reviewer_id != requester_id
    )
);

CREATE TRIGGER trg_approvals_updated_at
    BEFORE UPDATE ON public.approvals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Audit Logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT NOT NULL,
    target_label TEXT NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'system',
    badge_text VARCHAR(30),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to stamp actor profile information securely, preventing impersonation
CREATE OR REPLACE FUNCTION public.stamp_audit_log_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Force actor_id to authenticated identity unless caller is verified COO
        IF NEW.actor_id IS NULL OR NEW.actor_id != auth.uid() THEN
            IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'coo' THEN
                NEW.actor_id = auth.uid();
                SELECT full_name, role::text INTO NEW.actor_name, NEW.actor_role
                FROM public.profiles WHERE id = auth.uid();
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_audit_actor ON public.audit_logs;
CREATE TRIGGER trg_stamp_audit_actor
    BEFORE INSERT ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.stamp_audit_log_actor();

-- Trigger to enforce IMMUTABILITY of Audit Logs (prevents UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable and cannot be modified or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 17. AI Insights Table
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type insight_type NOT NULL,
    title TEXT NOT NULL,
    building_id TEXT REFERENCES public.buildings(id) ON DELETE SET NULL,
    building_name TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'advisory',
    summary TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    recommended_action TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- PERFORMANCE & QUERY INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_building ON public.incidents(building_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_building ON public.work_orders(building_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON public.inventory_items(current_stock);
CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON public.room_bookings(room_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON public.ai_insights(is_active);
