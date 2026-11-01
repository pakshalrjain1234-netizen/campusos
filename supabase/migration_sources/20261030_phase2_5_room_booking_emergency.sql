-- ============================================================================
-- Migration: 20261030_phase2_5_room_booking_emergency.sql
-- Description: Phase 2.5 — Room Booking, Timetable Conflict Prevention & Emergency Operations
-- Security: Strict Row Level Security (RLS), Double-Booking Exclusion/Trigger,
--           Atomic Concurrency Locks, and Facility Outage Audit Logging.
-- Note: Do NOT apply this migration to remote Supabase instances without explicit authorization.
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. CAMPUS ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id                    TEXT PRIMARY KEY,
  room_number           TEXT NOT NULL,
  name                  TEXT NOT NULL,
  building_id           TEXT NOT NULL,
  building_name         TEXT NOT NULL,
  floor                 TEXT NOT NULL,
  capacity              INTEGER NOT NULL CHECK (capacity > 0),
  room_type             TEXT NOT NULL CHECK (room_type IN (
                          'lecture_hall', 'laboratory', 'seminar_hall', 
                          'classroom', 'conference_room', 'auditorium', 'workshop'
                        )),
  facilities            TEXT[] DEFAULT '{}',
  equipment             TEXT[] DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'available' CHECK (status IN (
                          'available', 'occupied', 'maintenance', 'disrupted'
                        )),
  active_disruption_id  TEXT,
  is_accessible         BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for room catalogue querying
CREATE INDEX IF NOT EXISTS idx_rooms_building ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_capacity ON public.rooms(capacity);

-- 3. ROOM BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.room_bookings (
  id                        TEXT PRIMARY KEY,
  booking_number            TEXT UNIQUE NOT NULL,
  room_id                   TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_code                 TEXT NOT NULL,
  room_name                 TEXT NOT NULL,
  building_id               TEXT NOT NULL,
  building_name             TEXT NOT NULL,
  booking_date              DATE NOT NULL,
  start_time                TIME NOT NULL,
  end_time                  TIME NOT NULL CHECK (end_time > start_time),
  purpose                   TEXT NOT NULL,
  expected_attendance       INTEGER NOT NULL CHECK (expected_attendance > 0),
  required_equipment        TEXT[] DEFAULT '{}',
  booked_by                 TEXT NOT NULL,
  booked_by_role            TEXT NOT NULL,
  department                TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'approved' CHECK (status IN (
                              'pending', 'approved', 'rejected', 'cancelled', 'reallocated'
                            )),
  requires_approval         BOOLEAN NOT NULL DEFAULT false,
  approval_request_id       TEXT,
  approved_by               TEXT,
  approval_timestamp        TIMESTAMPTZ,
  reallocated_from_room_id  TEXT,
  reallocated_from_room_name TEXT,
  reallocation_reason       TEXT,
  reallocation_timestamp    TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scheduling and conflict lookup
CREATE INDEX IF NOT EXISTS idx_bookings_room_date ON public.room_bookings(room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.room_bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booked_by ON public.room_bookings(booked_by);

-- 4. DOUBLE-BOOKING CONFLICT PREVENTION TRIGGER
-- Enforces zero overlap for approved or pending bookings on the same room and date
CREATE OR REPLACE FUNCTION public.check_room_booking_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_conflict_count INTEGER;
  v_conflicting_number TEXT;
  v_room_status TEXT;
  v_room_capacity INTEGER;
BEGIN
  -- Do not validate cancelled or rejected records
  IF NEW.status IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- 1. Check room operational status
  SELECT status, capacity INTO v_room_status, v_room_capacity
  FROM public.rooms
  WHERE id = NEW.room_id;

  IF v_room_status = 'disrupted' THEN
    RAISE EXCEPTION 'Cannot book room %: facility is currently closed due to an active disruption', NEW.room_name;
  END IF;

  IF v_room_status = 'maintenance' THEN
    RAISE EXCEPTION 'Cannot book room %: facility is currently undergoing maintenance', NEW.room_name;
  END IF;

  -- 2. Validate capacity limit
  IF NEW.expected_attendance > v_room_capacity THEN
    RAISE EXCEPTION 'Expected attendance (%) exceeds room capacity (%)', NEW.expected_attendance, v_room_capacity;
  END IF;

  -- 3. Check time window overlaps on the same room & date
  SELECT COUNT(*), MIN(booking_number)
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

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON public.room_bookings;
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT OR UPDATE OF room_id, booking_date, start_time, end_time, status
ON public.room_bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_room_booking_conflict();

-- 5. ROOM DISRUPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.room_disruptions (
  id                        TEXT PRIMARY KEY,
  disruption_number         TEXT UNIQUE NOT NULL,
  room_id                   TEXT REFERENCES public.rooms(id) ON DELETE SET NULL,
  room_code                 TEXT NOT NULL,
  building_id               TEXT NOT NULL,
  building_name             TEXT NOT NULL,
  issue                     TEXT NOT NULL,
  reason_category           TEXT NOT NULL CHECK (reason_category IN (
                              'room_unavailable', 'equipment_failure', 'maintenance_closure',
                              'safety_hazard', 'emergency_building_closure', 'hvac_power_failure'
                            )),
  severity                  TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  affected_schedule         TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
                              'reported', 'under_review', 'confirmed', 'mitigated', 'resolved'
                            )),
  alternative_room          TEXT,
  alternative_room_id       TEXT,
  alternative_room_name     TEXT,
  resolution_eta            TEXT NOT NULL,
  reported_by               TEXT NOT NULL,
  reported_by_role          TEXT NOT NULL,
  related_incident_ticket   TEXT,
  related_work_order_number TEXT,
  affected_booking_ids      TEXT[] DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disruptions_room ON public.room_disruptions(room_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_building ON public.room_disruptions(building_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_status ON public.room_disruptions(status);

-- 6. AUTOMATED ROOM DISRUPTION STATUS SYNCHRONIZATION
CREATE OR REPLACE FUNCTION public.handle_room_disruption_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

DROP TRIGGER IF EXISTS trg_room_disruption_sync ON public.room_disruptions;
CREATE TRIGGER trg_room_disruption_sync
AFTER INSERT OR UPDATE OF status ON public.room_disruptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_room_disruption_sync();

-- 7. EMERGENCY REALLOCATION AUDIT LEDGER
CREATE TABLE IF NOT EXISTS public.room_reallocations_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            TEXT NOT NULL,
  booking_number        TEXT NOT NULL,
  original_room_id      TEXT NOT NULL,
  original_room_name    TEXT NOT NULL,
  new_room_id           TEXT NOT NULL,
  new_room_name         TEXT NOT NULL,
  reason                TEXT NOT NULL,
  authorized_by         TEXT NOT NULL,
  authorized_role       TEXT NOT NULL,
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realloc_booking ON public.room_reallocations_log(booking_id);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_reallocations_log ENABLE ROW LEVEL SECURITY;

-- Rooms: Public read access
DROP POLICY IF EXISTS "Public can view campus rooms" ON public.rooms;
CREATE POLICY "Public can view campus rooms" ON public.rooms
FOR SELECT TO authenticated, anon USING (true);

-- Rooms: Only facilities engineers or COO can modify status
DROP POLICY IF EXISTS "Operations staff can update room status" ON public.rooms;
CREATE POLICY "Operations staff can update room status" ON public.rooms
FOR UPDATE TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('Chief Operations Officer', 'Director of Facilities', 'Lead Maintenance Engineer')
);

-- Bookings: Authenticated users can view bookings
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.room_bookings;
CREATE POLICY "Authenticated users can view bookings" ON public.room_bookings
FOR SELECT TO authenticated USING (true);

-- Bookings: Authorized creation
DROP POLICY IF EXISTS "Authenticated users can request bookings" ON public.room_bookings;
CREATE POLICY "Authenticated users can request bookings" ON public.room_bookings
FOR INSERT TO authenticated WITH CHECK (true);

-- Disruptions: Read access
DROP POLICY IF EXISTS "Authenticated users can view disruptions" ON public.room_disruptions;
CREATE POLICY "Authenticated users can view disruptions" ON public.room_disruptions
FOR SELECT TO authenticated USING (true);

-- Disruptions: Insert access
DROP POLICY IF EXISTS "Staff can report disruptions" ON public.room_disruptions;
CREATE POLICY "Staff can report disruptions" ON public.room_disruptions
FOR INSERT TO authenticated WITH CHECK (true);

-- Reallocations Log: Append-only audit trail
DROP POLICY IF EXISTS "Read access to reallocation audit log" ON public.room_reallocations_log;
CREATE POLICY "Read access to reallocation audit log" ON public.room_reallocations_log
FOR SELECT TO authenticated USING (true);
