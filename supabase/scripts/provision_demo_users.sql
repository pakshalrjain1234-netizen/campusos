-- ==============================================================================
-- CAMPUSOPS — SIX OFFICIAL DEMO ACCOUNTS SQL PROVISIONING SCRIPT
-- Executes against Supabase PostgreSQL to configure profiles for the 6 official roles.
-- ==============================================================================

-- 1. Ensure required departments exist
INSERT INTO public.departments (id, name, code, contact_email)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'Office of Campus Infrastructure & Strategic Operations', 'INFRA', 'facilities@campusops.demo'),
    ('d1000000-0000-0000-0000-000000000002', 'Facility Engineering & Maintenance', 'FAC-ENG', 'technician@campusops.demo'),
    ('d1000000-0000-0000-0000-000000000003', 'Department of Computing & IT Services', 'ITS', 'manager@campusops.demo')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    contact_email = EXCLUDED.contact_email;

-- 2. Link or Update Profiles (matches auth.users created via Supabase Admin API)
-- Role enum strictly enforces: student_faculty, technician, department_manager,
-- facilities_administrator, procurement_approver, system_administrator.

UPDATE public.profiles SET
    role = 'student_faculty'::app_role,
    full_name = 'Anita Patel (Student Rep)',
    department_id = 'd1000000-0000-0000-0000-000000000003',
    is_active = true
WHERE email = 'student@campusops.demo';

UPDATE public.profiles SET
    role = 'technician'::app_role,
    full_name = 'Vikram Sundaram (HVAC Tech)',
    department_id = 'd1000000-0000-0000-0000-000000000002',
    is_active = true
WHERE email = 'technician@campusops.demo';

UPDATE public.profiles SET
    role = 'department_manager'::app_role,
    full_name = 'Prof. Marcus Vance (Dept Head)',
    department_id = 'd1000000-0000-0000-0000-000000000003',
    is_active = true
WHERE email = 'manager@campusops.demo';

UPDATE public.profiles SET
    role = 'facilities_administrator'::app_role,
    full_name = 'Dr. Jennifer Rao (Facilities Lead)',
    department_id = 'd1000000-0000-0000-0000-000000000001',
    is_active = true
WHERE email = 'facilities@campusops.demo';

UPDATE public.profiles SET
    role = 'procurement_approver'::app_role,
    full_name = 'Sunita Deshmukh (Procurement Lead)',
    department_id = 'd1000000-0000-0000-0000-000000000001',
    is_active = true
WHERE email = 'procurement@campusops.demo';

UPDATE public.profiles SET
    role = 'system_administrator'::app_role,
    full_name = 'Rajesh Varma (System Admin)',
    department_id = 'd1000000-0000-0000-0000-000000000003',
    is_active = true
WHERE email = 'admin@campusops.demo';

