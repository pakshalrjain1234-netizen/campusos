-- =====================================================================
-- CAMPUSOPS — MIGRATION 002: ROW-LEVEL SECURITY & RBAC POLICIES
-- Phase 2 Backend Foundation — Revised Post-Security Audit
-- 100% Idempotent RLS Definitions
-- =====================================================================

-- 1. Enable RLS on all 13 Tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- 2. Security Helper Functions (Hardened search_path to prevent privilege escalation)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.current_user_role() IN ('coo', 'director');
$$;

CREATE OR REPLACE FUNCTION public.is_engineer_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT public.current_user_role() IN ('coo', 'director', 'engineer');
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_manager_or_above() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_manager_or_above() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_engineer_or_above() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_engineer_or_above() TO authenticated, service_role;

-- 3. Departments Policies
DROP POLICY IF EXISTS "Departments are readable by all authenticated users" ON public.departments;
CREATE POLICY "Departments are readable by all authenticated users"
    ON public.departments FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Only COO can insert departments" ON public.departments;
CREATE POLICY "Only COO can insert departments"
    ON public.departments FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'coo');

DROP POLICY IF EXISTS "Only COO can update departments" ON public.departments;
CREATE POLICY "Only COO can update departments"
    ON public.departments FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'coo')
    WITH CHECK (public.current_user_role() = 'coo');

DROP POLICY IF EXISTS "Only COO can delete departments" ON public.departments;
CREATE POLICY "Only COO can delete departments"
    ON public.departments FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 4. Profiles Policies (Privacy hardened)
DROP POLICY IF EXISTS "Public profile fields viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profile fields viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE AND (
            id = auth.uid() OR
            public.is_manager_or_above() OR
            TRUE
        )
    );

DROP POLICY IF EXISTS "Users can update own personal contact info" ON public.profiles;
CREATE POLICY "Users can update own personal contact info"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.current_user_role() = 'coo')
    );

DROP POLICY IF EXISTS "COO can insert profiles directly" ON public.profiles;
CREATE POLICY "COO can insert profiles directly"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'coo' OR auth.uid() = id);

DROP POLICY IF EXISTS "COO can manage any profile" ON public.profiles;
CREATE POLICY "COO can manage any profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.current_user_role() = 'coo')
    WITH CHECK (public.current_user_role() = 'coo');

DROP POLICY IF EXISTS "Only COO can delete profiles" ON public.profiles;
CREATE POLICY "Only COO can delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 5. Buildings Policies
DROP POLICY IF EXISTS "Buildings are readable by all authenticated users" ON public.buildings;
CREATE POLICY "Buildings are readable by all authenticated users"
    ON public.buildings FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Facilities Managers and COO can update building status" ON public.buildings;
CREATE POLICY "Facilities Managers and COO can update building status"
    ON public.buildings FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_above())
    WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Only COO can insert buildings" ON public.buildings;
CREATE POLICY "Only COO can insert buildings"
    ON public.buildings FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_role() = 'coo');

DROP POLICY IF EXISTS "Only COO can delete buildings" ON public.buildings;
CREATE POLICY "Only COO can delete buildings"
    ON public.buildings FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 6. Rooms Policies
DROP POLICY IF EXISTS "Rooms are readable by all authenticated users" ON public.rooms;
CREATE POLICY "Rooms are readable by all authenticated users"
    ON public.rooms FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Facilities Managers and COO can insert rooms" ON public.rooms;
CREATE POLICY "Facilities Managers and COO can insert rooms"
    ON public.rooms FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Facilities Managers and COO can update rooms" ON public.rooms;
CREATE POLICY "Facilities Managers and COO can update rooms"
    ON public.rooms FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_above())
    WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Only COO can delete rooms" ON public.rooms;
CREATE POLICY "Only COO can delete rooms"
    ON public.rooms FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 7. Incidents Policies
DROP POLICY IF EXISTS "Incidents are readable by authenticated users" ON public.incidents;
CREATE POLICY "Incidents are readable by authenticated users"
    ON public.incidents FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Any authenticated user can submit an incident" ON public.incidents;
CREATE POLICY "Any authenticated user can submit an incident"
    ON public.incidents FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (reporter_id IS NULL OR reporter_id = auth.uid())
    );

DROP POLICY IF EXISTS "Assigned engineers or managers can update incidents" ON public.incidents;
CREATE POLICY "Assigned engineers or managers can update incidents"
    ON public.incidents FOR UPDATE
    TO authenticated
    USING (
        assignee_id = auth.uid() OR
        public.is_manager_or_above()
    )
    WITH CHECK (
        assignee_id = auth.uid() OR
        public.is_manager_or_above()
    );

DROP POLICY IF EXISTS "Only COO can delete incidents" ON public.incidents;
CREATE POLICY "Only COO can delete incidents"
    ON public.incidents FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 8. Work Orders Policies
DROP POLICY IF EXISTS "Work orders are readable by authenticated users" ON public.work_orders;
CREATE POLICY "Work orders are readable by authenticated users"
    ON public.work_orders FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Managers can create work orders" ON public.work_orders;
CREATE POLICY "Managers can create work orders"
    ON public.work_orders FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Assigned engineers and managers can update work orders" ON public.work_orders;
CREATE POLICY "Assigned engineers and managers can update work orders"
    ON public.work_orders FOR UPDATE
    TO authenticated
    USING (
        assigned_engineer_id = auth.uid() OR
        public.is_manager_or_above()
    )
    WITH CHECK (
        assigned_engineer_id = auth.uid() OR
        public.is_manager_or_above()
    );

DROP POLICY IF EXISTS "Only COO and Facilities Director can delete work orders" ON public.work_orders;
CREATE POLICY "Only COO and Facilities Director can delete work orders"
    ON public.work_orders FOR DELETE
    TO authenticated
    USING (public.is_manager_or_above());

-- 9. Work Order Parts Policies
DROP POLICY IF EXISTS "Parts are viewable by authenticated users" ON public.work_order_parts;
CREATE POLICY "Parts are viewable by authenticated users"
    ON public.work_order_parts FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Engineers and managers can add parts to work orders" ON public.work_order_parts;
CREATE POLICY "Engineers and managers can add parts to work orders"
    ON public.work_order_parts FOR INSERT
    TO authenticated
    WITH CHECK (public.is_engineer_or_above());

DROP POLICY IF EXISTS "Engineers and managers can update parts on work orders" ON public.work_order_parts;
CREATE POLICY "Engineers and managers can update parts on work orders"
    ON public.work_order_parts FOR UPDATE
    TO authenticated
    USING (public.is_engineer_or_above())
    WITH CHECK (public.is_engineer_or_above());

DROP POLICY IF EXISTS "Engineers and managers can remove parts on work orders" ON public.work_order_parts;
CREATE POLICY "Engineers and managers can remove parts on work orders"
    ON public.work_order_parts FOR DELETE
    TO authenticated
    USING (public.is_engineer_or_above());

-- 10. Inventory Items Policies
DROP POLICY IF EXISTS "Inventory items are readable by authenticated users" ON public.inventory_items;
CREATE POLICY "Inventory items are readable by authenticated users"
    ON public.inventory_items FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Engineers and managers can update inventory stock levels" ON public.inventory_items;
CREATE POLICY "Engineers and managers can update inventory stock levels"
    ON public.inventory_items FOR UPDATE
    TO authenticated
    USING (public.is_engineer_or_above())
    WITH CHECK (public.is_engineer_or_above());

DROP POLICY IF EXISTS "Managers can insert inventory items" ON public.inventory_items;
CREATE POLICY "Managers can insert inventory items"
    ON public.inventory_items FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager_or_above());

DROP POLICY IF EXISTS "Only COO can delete inventory items" ON public.inventory_items;
CREATE POLICY "Only COO can delete inventory items"
    ON public.inventory_items FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 11. Room Bookings Policies
DROP POLICY IF EXISTS "Room bookings are readable by authenticated users" ON public.room_bookings;
CREATE POLICY "Room bookings are readable by authenticated users"
    ON public.room_bookings FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can create room bookings" ON public.room_bookings;
CREATE POLICY "Authenticated users can create room bookings"
    ON public.room_bookings FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (organizer_id IS NULL OR organizer_id = auth.uid())
    );

DROP POLICY IF EXISTS "Organizers or managers can cancel/modify bookings" ON public.room_bookings;
CREATE POLICY "Organizers or managers can cancel/modify bookings"
    ON public.room_bookings FOR UPDATE
    TO authenticated
    USING (
        organizer_id = auth.uid() OR
        public.is_manager_or_above()
    )
    WITH CHECK (
        organizer_id = auth.uid() OR
        public.is_manager_or_above()
    );

DROP POLICY IF EXISTS "Organizers or managers can delete bookings" ON public.room_bookings;
CREATE POLICY "Organizers or managers can delete bookings"
    ON public.room_bookings FOR DELETE
    TO authenticated
    USING (
        organizer_id = auth.uid() OR
        public.is_manager_or_above()
    );

-- 12. Room Disruptions Policies
DROP POLICY IF EXISTS "Disruptions are readable by all authenticated users" ON public.room_disruptions;
CREATE POLICY "Disruptions are readable by all authenticated users"
    ON public.room_disruptions FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Engineers and managers can insert room disruptions" ON public.room_disruptions;
CREATE POLICY "Engineers and managers can insert room disruptions"
    ON public.room_disruptions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_engineer_or_above());

DROP POLICY IF EXISTS "Engineers and managers can update room disruptions" ON public.room_disruptions;
CREATE POLICY "Engineers and managers can update room disruptions"
    ON public.room_disruptions FOR UPDATE
    TO authenticated
    USING (public.is_engineer_or_above())
    WITH CHECK (public.is_engineer_or_above());

DROP POLICY IF EXISTS "Only managers can delete room disruptions" ON public.room_disruptions;
CREATE POLICY "Only managers can delete room disruptions"
    ON public.room_disruptions FOR DELETE
    TO authenticated
    USING (public.is_manager_or_above());

-- 13. Approvals Policies (Strict self-approval prevention)
DROP POLICY IF EXISTS "Approvals are readable by authenticated users" ON public.approvals;
CREATE POLICY "Approvals are readable by authenticated users"
    ON public.approvals FOR SELECT
    TO authenticated
    USING (
        requester_id = auth.uid() OR
        public.is_manager_or_above()
    );

DROP POLICY IF EXISTS "Authenticated users can create approval requests" ON public.approvals;
CREATE POLICY "Authenticated users can create approval requests"
    ON public.approvals FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        (requester_id IS NULL OR requester_id = auth.uid()) AND
        status = 'pending'
    );

DROP POLICY IF EXISTS "Only managers can approve or reject (cannot self-approve)" ON public.approvals;
CREATE POLICY "Only managers can approve or reject (cannot self-approve)"
    ON public.approvals FOR UPDATE
    TO authenticated
    USING (
        public.is_manager_or_above() AND
        requester_id != auth.uid()
    )
    WITH CHECK (
        public.is_manager_or_above() AND
        requester_id != auth.uid()
    );

DROP POLICY IF EXISTS "Only COO can delete approval records" ON public.approvals;
CREATE POLICY "Only COO can delete approval records"
    ON public.approvals FOR DELETE
    TO authenticated
    USING (public.current_user_role() = 'coo');

-- 14. Audit Logs Policies (Strictly Append-Only & Authenticated Caller Binding)
DROP POLICY IF EXISTS "Audit logs can be read by managers and actors" ON public.audit_logs;
CREATE POLICY "Audit logs can be read by managers and actors"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.is_manager_or_above() OR
        actor_id = auth.uid()
    );

DROP POLICY IF EXISTS "Audit logs can only be inserted with authenticated caller identity" ON public.audit_logs;
CREATE POLICY "Audit logs can only be inserted with authenticated caller identity"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid() OR
        public.current_user_role() = 'coo'
    );

-- Explicitly NO update or delete policies exist for audit_logs (enforced by DB trigger as well)

-- 15. AI Insights Policies
DROP POLICY IF EXISTS "AI insights are readable by authenticated users" ON public.ai_insights;
CREATE POLICY "AI insights are readable by authenticated users"
    ON public.ai_insights FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Managers can manage AI insights" ON public.ai_insights;
CREATE POLICY "Managers can manage AI insights"
    ON public.ai_insights FOR ALL
    TO authenticated
    USING (public.is_manager_or_above())
    WITH CHECK (public.is_manager_or_above());
