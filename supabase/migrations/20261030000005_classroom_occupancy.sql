-- ============================================================================
-- CAMPUSOPS — MIGRATION 20261030000005: INTELLIGENT CLASSROOM OCCUPANCY & IOT
-- ============================================================================
-- Description: Supports Phase 2.6 Intelligent Classroom Occupancy Management,
-- Faculty Check-In presence tracking, Smart Classroom Finder queries, and future
-- ESP32 + mmWave / PIR hardware telemetry ingestion.
-- NOTE: Prepared for Phase 2.6. DO NOT AUTO-APPLY WITHOUT EXECUTIVE AUTHORIZATION.
-- ============================================================================

-- 1. Enums for Occupancy State & Data Sources
DO $$ BEGIN
    CREATE TYPE occupancy_status AS ENUM (
        'occupied',
        'scheduled',
        'available',
        'unknown',
        'under_maintenance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE occupancy_data_source AS ENUM (
        'faculty_checkin',
        'timetable',
        'booking',
        'sensor_iot',
        'manual_inspection'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sensor_device_type AS ENUM (
        'pir',
        'mmwave_radar',
        'ble_beacon',
        'esp32_gateway'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Table: classroom_occupancy_records
CREATE TABLE IF NOT EXISTS public.classroom_occupancy_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(25) NOT NULL,
    room_name TEXT NOT NULL,
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    floor INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL DEFAULT 40,
    equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
    status occupancy_status NOT NULL DEFAULT 'unknown',
    data_source occupancy_data_source NOT NULL DEFAULT 'timetable',
    confidence_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    current_class JSONB DEFAULT NULL,
    upcoming_classes JSONB DEFAULT '[]'::jsonb,
    maintenance_issue TEXT DEFAULT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classroom_occupancy_building 
    ON public.classroom_occupancy_records(building_id, floor);
CREATE INDEX IF NOT EXISTS idx_classroom_occupancy_status 
    ON public.classroom_occupancy_records(status);

-- 3. Table: occupancy_sensors (Hardware-ready abstraction for future ESP32 + Radar)
CREATE TABLE IF NOT EXISTS public.occupancy_sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id VARCHAR(60) NOT NULL UNIQUE,
    room_code VARCHAR(25) NOT NULL,
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    sensor_type sensor_device_type NOT NULL DEFAULT 'mmwave_radar',
    occupancy_value VARCHAR(30) NOT NULL DEFAULT 'vacant', -- 'motion_detected', 'vacant', 'offline'
    last_signal_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    connection_status VARCHAR(20) NOT NULL DEFAULT 'online', -- 'online', 'standby', 'offline'
    hardware_specs TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensors_room_code 
    ON public.occupancy_sensors(room_code);

-- 4. Table: faculty_checkins (Verifiable physical presence check-ins)
CREATE TABLE IF NOT EXISTS public.faculty_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(25) NOT NULL,
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    faculty_name TEXT NOT NULL,
    course_code VARCHAR(30) NOT NULL,
    course_name TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faculty_checkins_active 
    ON public.faculty_checkins(room_code, is_active);

-- 5. Enable Row Level Security
ALTER TABLE public.classroom_occupancy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancy_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_checkins ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- SELECT: All authenticated roles can view classroom occupancy records
CREATE POLICY p_classroom_occupancy_select ON public.classroom_occupancy_records
    FOR SELECT TO authenticated
    USING (TRUE);

-- MODIFY: COO and Director can manage occupancy records
CREATE POLICY p_classroom_occupancy_modify ON public.classroom_occupancy_records
    FOR ALL TO authenticated
    USING (public.current_app_role() IN ('coo', 'director'))
    WITH CHECK (public.current_app_role() IN ('coo', 'director'));

-- SENSORS: Viewable by authenticated staff
CREATE POLICY p_sensors_select ON public.occupancy_sensors
    FOR SELECT TO authenticated
    USING (TRUE);

-- SENSORS: Modifiable only by COO, Director or Engineer
CREATE POLICY p_sensors_modify ON public.occupancy_sensors
    FOR ALL TO authenticated
    USING (public.current_app_role() IN ('coo', 'director', 'engineer'))
    WITH CHECK (public.current_app_role() IN ('coo', 'director', 'engineer'));

-- FACULTY CHECKINS: Authenticated users can insert check-in records
CREATE POLICY p_checkins_select ON public.faculty_checkins
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY p_checkins_insert ON public.faculty_checkins
    FOR INSERT TO authenticated
    WITH CHECK (TRUE);

-- ============================================================================
-- END OF MIGRATION 20261030000005
-- ============================================================================

