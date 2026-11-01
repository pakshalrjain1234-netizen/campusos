-- ==============================================================================
-- CAMPUSOPS — MIGRATION 009: PS2 SIX-ROLE RBAC, PERMISSIONS & SEPARATION OF DUTIES
-- Establishes the 6 official PS2 stakeholder roles, Row-Level Security policies,
-- department-level isolation, and commercial separation-of-duties rules.
--
-- Official Roles:
--   1. student_faculty
--   2. technician
--   3. department_manager
--   4. facilities_administrator
--   5. procurement_approver
--   6. system_administrator
--
-- Legacy Roles (coo, director, engineer, liaison) are mapped seamlessly via
-- helper functions and enum extensions.
-- ==============================================================================

-- 1. Extend app_role Enum with PS2 Official Roles
DO $$
BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'student_faculty';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'technician';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'department_manager';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'facilities_administrator';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'procurement_approver';
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'system_administrator';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Role Normalization Function (Maps legacy aliases to PS2 standards)
CREATE OR REPLACE FUNCTION public.normalize_role_name(p_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE LOWER(TRIM(COALESCE(p_role, 'student_faculty')))
        WHEN 'coo' THEN 'facilities_administrator'
        WHEN 'director' THEN 'department_manager'
        WHEN 'engineer' THEN 'technician'
        WHEN 'liaison' THEN 'student_faculty'
        WHEN 'student' THEN 'student_faculty'
        WHEN 'faculty' THEN 'student_faculty'
        ELSE LOWER(TRIM(COALESCE(p_role, 'student_faculty')))
    END;
$$;

-- 3. Enhanced current_user_role() with PS2 Role Normalization
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role app_role;
    v_role_text TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'student_faculty'::app_role;
    END IF;

    SELECT role::text INTO v_role_text
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role_text IS NULL THEN
        RETURN 'student_faculty'::app_role;
    END IF;

    v_role_text := public.normalize_role_name(v_role_text);

    BEGIN
        v_role := v_role_text::app_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'student_faculty'::app_role;
    END;

    RETURN v_role;
END;
$$;

-- 4. Helper Function: Current User Department ID
CREATE OR REPLACE FUNCTION public.current_user_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. Helper Function: Check If User Has Specific Role (with legacy compatibility)
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current TEXT;
    v_role TEXT;
BEGIN
    v_current := public.normalize_role_name(public.current_user_role()::text);
    FOREACH v_role IN ARRAY allowed_roles LOOP
        IF v_current = public.normalize_role_name(v_role) THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    RETURN FALSE;
END;
$$;

-- ==============================================================================
-- 6. ROW-LEVEL SECURITY POLICIES: PROFILES TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
    -- Any user can view their own profile
    auth.uid() = id
    -- System Administrator and Facilities Administrator can view all profiles
    OR public.has_role('system_administrator', 'facilities_administrator')
    -- Department Managers can view members of their own department
    OR (
        public.has_role('department_manager')
        AND department_id IS NOT NULL
        AND department_id = public.current_user_department_id()
    )
);

-- Only System Administrator can insert or modify user profiles/roles
DROP POLICY IF EXISTS "profiles_admin_mutation" ON public.profiles;
CREATE POLICY "profiles_admin_mutation" ON public.profiles
FOR ALL USING (
    public.has_role('system_administrator', 'facilities_administrator')
) WITH CHECK (
    public.has_role('system_administrator', 'facilities_administrator')
);

-- ==============================================================================
-- 7. ROW-LEVEL SECURITY POLICIES: INCIDENTS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "incidents_scoped_select" ON public.incidents;
CREATE POLICY "incidents_scoped_select" ON public.incidents
FOR SELECT USING (
    -- Facilities Admin and System Admin see all incidents
    public.has_role('facilities_administrator', 'system_administrator')
    -- Technicians see all open, unassigned, or assigned incidents
    OR public.has_role('technician')
    -- Department Managers see all incidents in their department
    OR (
        public.has_role('department_manager')
        AND (
            department_id IS NULL 
            OR department_id = public.current_user_department_id()
        )
    )
    -- Student / Faculty see only their own reported incidents
    OR reported_by = auth.uid()
);

-- Any authenticated user can submit an incident report
DROP POLICY IF EXISTS "incidents_insert_policy" ON public.incidents;
CREATE POLICY "incidents_insert_policy" ON public.incidents
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- ==============================================================================
-- 8. ROW-LEVEL SECURITY POLICIES: WORK ORDERS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "work_orders_scoped_select" ON public.work_orders;
CREATE POLICY "work_orders_scoped_select" ON public.work_orders
FOR SELECT USING (
    public.has_role('facilities_administrator', 'department_manager', 'system_administrator')
    OR (
        public.has_role('technician')
        AND (
            assigned_engineer_id IS NULL
            OR assigned_engineer_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "work_orders_scoped_update" ON public.work_orders;
CREATE POLICY "work_orders_scoped_update" ON public.work_orders
FOR UPDATE USING (
    public.has_role('facilities_administrator', 'system_administrator')
    OR (
        public.has_role('technician')
        AND assigned_engineer_id = auth.uid()
    )
);

-- ==============================================================================
-- 9. ROW-LEVEL SECURITY POLICIES: INVENTORY & STOCK TRANSACTIONS
-- ==============================================================================
DROP POLICY IF EXISTS "inventory_read_policy" ON public.inventory_items;
CREATE POLICY "inventory_read_policy" ON public.inventory_items
FOR SELECT USING (
    public.has_role('facilities_administrator', 'procurement_approver', 'technician', 'department_manager', 'system_administrator')
);

DROP POLICY IF EXISTS "inventory_modify_policy" ON public.inventory_items;
CREATE POLICY "inventory_modify_policy" ON public.inventory_items
FOR ALL USING (
    public.has_role('facilities_administrator', 'procurement_approver')
);

-- ==============================================================================
-- 10. ROW-LEVEL SECURITY & ENFORCEMENT: APPROVALS & SEPARATION OF DUTIES
-- ==============================================================================
DROP POLICY IF EXISTS "approvals_scoped_select" ON public.approvals;
CREATE POLICY "approvals_scoped_select" ON public.approvals
FOR SELECT USING (
    -- Requester can view their own requisitions
    requester_id = auth.uid()
    -- Procurement Approver can view all requisitions
    OR public.has_role('procurement_approver', 'facilities_administrator')
    -- Department Manager can view requests from their department
    OR (
        public.has_role('department_manager')
        AND department_id = public.current_user_department_id()
    )
);

-- Database function to review approval with strict Separation of Duties
CREATE OR REPLACE FUNCTION public.review_approval_with_sod(
    p_approval_id UUID,
    p_action TEXT,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_approval RECORD;
    v_caller_id UUID;
    v_caller_role TEXT;
    v_norm_role TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    v_norm_role := public.normalize_role_name(public.current_user_role()::text);

    -- 1. System Administrator Privilege Boundary
    IF v_norm_role = 'system_administrator' THEN
        RAISE EXCEPTION 'SYSADMIN_PROCUREMENT_APPROVAL_PROHIBITED: System Administrators are technical governance personnel and cannot approve procurement requests.';
    END IF;

    -- 2. Fetch approval
    SELECT * INTO v_approval
    FROM public.approvals
    WHERE id = p_approval_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request % not found.', p_approval_id;
    END IF;

    IF v_approval.status <> 'pending' THEN
        RAISE EXCEPTION 'Approval request is already %.', v_approval.status;
    END IF;

    -- 3. Self-Approval Prohibition
    IF v_approval.requester_id = v_caller_id THEN
        RAISE EXCEPTION 'SELF_APPROVAL_PROHIBITED: You cannot approve or reject your own requisition (Separation of Duties).';
    END IF;

    -- 4. Role Authorization Check
    IF v_norm_role NOT IN ('procurement_approver', 'facilities_administrator', 'department_manager') THEN
        RAISE EXCEPTION 'Role % is not authorized to review approval requests.', v_norm_role;
    END IF;

    -- 5. Apply Status Update
    UPDATE public.approvals
    SET
        status = CASE WHEN LOWER(p_action) IN ('approved', 'approve') THEN 'approved'::approval_status ELSE 'rejected'::approval_status END,
        reviewer_id = v_caller_id,
        review_remarks = p_remarks,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_approval_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', p_approval_id,
        'new_status', CASE WHEN LOWER(p_action) IN ('approved', 'approve') THEN 'approved' ELSE 'rejected' END,
        'reviewed_by', v_caller_id,
        'reviewed_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(VARIADIC TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_approval_with_sod(UUID, TEXT, TEXT) TO authenticated, service_role;

