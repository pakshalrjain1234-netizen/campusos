-- ============================================================================
-- CAMPUSOPS — MIGRATION 20261030000004: INCIDENT & MAINTENANCE ENHANCEMENTS
-- ============================================================================
-- Description: Extends incidents and work_orders for Phase 2.3 Intelligent Incident
-- & Maintenance Management. Adds lifecycle audit trail (incident_timeline_events),
-- multi-factor triage scoring columns, SLA tracking columns, work order inspection,
-- and engineer skill profiles.
-- Safety: Idempotent DDL; respects existing foreign keys and enums.
-- NOTE: Prepared for Phase 2.3 deployment. DO NOT AUTO-APPLY WITHOUT COO APPROVAL.
-- ============================================================================

-- 1. Extend incident categories enum if needed (PostgreSQL 12+ safe addition)
ALTER TYPE incident_category ADD VALUE IF NOT EXISTS 'Sanitation';
ALTER TYPE incident_category ADD VALUE IF NOT EXISTS 'Pest Control';
ALTER TYPE incident_category ADD VALUE IF NOT EXISTS 'Furniture & Fixtures';
ALTER TYPE incident_category ADD VALUE IF NOT EXISTS 'Landscaping';
ALTER TYPE incident_category ADD VALUE IF NOT EXISTS 'General';

-- 2. Create Incident Lifecycle Status Enum (expanded state machine)
DO $$ BEGIN
    CREATE TYPE incident_lifecycle_status AS ENUM (
        'reported',
        'triaged',
        'assigned',
        'acknowledged',
        'in_progress',
        'resolved',
        'closed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Safety risk level enum
DO $$ BEGIN
    CREATE TYPE safety_risk_level AS ENUM (
        'low',
        'medium',
        'high',
        'hazardous'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Disruption level enum
DO $$ BEGIN
    CREATE TYPE disruption_level AS ENUM (
        'none',
        'minor',
        'moderate',
        'severe'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Add intelligent triage & SLA tracking columns to incidents table
ALTER TABLE public.incidents 
    ADD COLUMN IF NOT EXISTS lifecycle_status incident_lifecycle_status DEFAULT 'reported',
    ADD COLUMN IF NOT EXISTS safety_risk safety_risk_level DEFAULT 'low',
    ADD COLUMN IF NOT EXISTS disruption_level disruption_level DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS people_affected INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS triage_score NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS triage_reason TEXT,
    ADD COLUMN IF NOT EXISTS ack_sla_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
    ADD COLUMN IF NOT EXISTS is_sla_breached BOOLEAN DEFAULT FALSE;

-- 6. Create incident_timeline_events table (audit trail for state transitions)
CREATE TABLE IF NOT EXISTS public.incident_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role app_role NOT NULL,
    remarks TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident_id 
    ON public.incident_timeline_events(incident_id, created_at ASC);

-- 7. Add maintenance execution columns to work_orders table
ALTER TABLE public.work_orders
    ADD COLUMN IF NOT EXISTS diagnosis TEXT,
    ADD COLUMN IF NOT EXISTS repair_instructions TEXT,
    ADD COLUMN IF NOT EXISTS completion_notes TEXT,
    ADD COLUMN IF NOT EXISTS inspected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS target_resolution_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS parts_cost_estimate NUMERIC(10,2) DEFAULT 0;

-- 8. Engineer Skills & Specializations Table
CREATE TABLE IF NOT EXISTS public.engineer_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category incident_category NOT NULL,
    proficiency_level VARCHAR(20) DEFAULT 'expert', -- 'apprentice', 'journeyman', 'expert'
    is_primary BOOLEAN DEFAULT FALSE,
    max_concurrent_orders INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(engineer_id, category)
);

CREATE INDEX IF NOT EXISTS idx_engineer_skills_category 
    ON public.engineer_skills(category);

-- 9. Enable RLS on newly created tables
ALTER TABLE public.incident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineer_skills ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for incident_timeline_events
-- SELECT: Users can view timeline if they can view the incident
CREATE POLICY p_timeline_select ON public.incident_timeline_events
    FOR SELECT TO authenticated
    USING (
        public.current_app_role() IN ('coo', 'director', 'engineer')
        OR (
            public.current_app_role() = 'liaison'
            AND EXISTS (
                SELECT 1 FROM public.incidents i
                WHERE i.id = incident_timeline_events.incident_id
                  AND i.reporter_id = auth.uid()
            )
        )
    );

-- INSERT: Authenticated users can insert events for incidents they have permission to transition
CREATE POLICY p_timeline_insert ON public.incident_timeline_events
    FOR INSERT TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        AND (
            public.current_app_role() IN ('coo', 'director', 'engineer')
            OR (
                public.current_app_role() = 'liaison'
                AND to_status IN ('reported', 'cancelled')
            )
        )
    );

-- 11. RLS Policies for engineer_skills
CREATE POLICY p_engineer_skills_select ON public.engineer_skills
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY p_engineer_skills_modify ON public.engineer_skills
    FOR ALL TO authenticated
    USING (public.current_app_role() IN ('coo', 'director'))
    WITH CHECK (public.current_app_role() IN ('coo', 'director'));

-- ============================================================================
-- END OF MIGRATION 20261030000004
-- ============================================================================

