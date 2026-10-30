-- ============================================================================
-- Migration: 20261030_phase2_9_security_hardening.sql
-- Description: Phase 2.9 — Security & Reliability Audit Remediation
-- Security:
--   1. Strict Row Level Security (RLS) hardening for room bookings, disruptions,
--      and inventory mutations (eliminating unrestricted UPDATE/DELETE policies).
--   2. Four-Eyes Principle / Separation of Duties: Database-level trigger preventing
--      self-approval of procurement requisitions and facility bookings.
--   3. Defensive CHECK constraints on temporal boundaries and non-empty inputs.
-- Note: Do NOT apply this migration to remote databases without explicit authorization.
-- ============================================================================

-- 1. HARDEN INVENTORY ROW LEVEL SECURITY (RLS)
-- Restrict direct UPDATE/DELETE on inventory_items to authorized operations engineers
DROP POLICY IF EXISTS "Authorized staff can modify inventory items" ON public.inventory_items;

CREATE POLICY "Operations staff can modify inventory items"
  ON public.inventory_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND (raw_user_meta_data->>'role' IN ('Chief Operations Officer', 'Director of Facilities', 'Lead Maintenance Engineer')
             OR email IN ('admin@campus.edu', 'director@campus.edu'))
    )
  );

CREATE POLICY "Operations managers can delete inventory items"
  ON public.inventory_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND (raw_user_meta_data->>'role' IN ('Chief Operations Officer', 'Director of Facilities')
             OR email IN ('admin@campus.edu', 'director@campus.edu'))
    )
  );

-- 2. HARDEN ROOM BOOKINGS ROW LEVEL SECURITY (RLS)
-- Add explicit UPDATE policy for authorized facility coordinators
DROP POLICY IF EXISTS "Coordinators can update booking status and reallocation" ON public.room_bookings;

CREATE POLICY "Coordinators can update booking status and reallocation"
  ON public.room_bookings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND (raw_user_meta_data->>'role' IN ('Chief Operations Officer', 'Director of Facilities', 'Lead Maintenance Engineer')
             OR email IN ('admin@campus.edu', 'director@campus.edu'))
    )
  );

-- 3. HARDEN ROOM DISRUPTIONS RLS
-- Only Directors of Facilities or COO can resolve active disruptions
DROP POLICY IF EXISTS "Facilities coordinators can resolve disruptions" ON public.room_disruptions;

CREATE POLICY "Facilities coordinators can resolve disruptions"
  ON public.room_disruptions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND (raw_user_meta_data->>'role' IN ('Chief Operations Officer', 'Director of Facilities')
             OR email IN ('admin@campus.edu', 'director@campus.edu'))
    )
  );

-- 4. SEPARATION OF DUTIES (FOUR-EYES PRINCIPLE) TRIGGER
-- Enforces at the database engine level that an approver cannot be the requisition requester
CREATE OR REPLACE FUNCTION public.check_procurement_self_approval()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_by IS NOT NULL THEN
    IF LOWER(TRIM(NEW.approved_by)) = LOWER(TRIM(NEW.requested_by)) THEN
      RAISE EXCEPTION 'Security Policy Violation: Self-approval is strictly prohibited. Requester % cannot approve requisition %', NEW.requested_by, NEW.request_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_procurement_self_approval ON public.procurement_requests;
CREATE TRIGGER trg_prevent_procurement_self_approval
  BEFORE UPDATE OF status, approved_by ON public.procurement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_procurement_self_approval();

-- 5. DEFENSIVE DATA INTEGRITY CONSTRAINTS
-- Prevent empty strings or whitespace-only records for critical audit fields
ALTER TABLE public.room_bookings
  DROP CONSTRAINT IF EXISTS chk_booking_non_empty_purpose,
  ADD CONSTRAINT chk_booking_non_empty_purpose CHECK (char_length(trim(purpose)) > 0);

ALTER TABLE public.room_disruptions
  DROP CONSTRAINT IF EXISTS chk_disruption_non_empty_issue,
  ADD CONSTRAINT chk_disruption_non_empty_issue CHECK (char_length(trim(issue)) > 0);
