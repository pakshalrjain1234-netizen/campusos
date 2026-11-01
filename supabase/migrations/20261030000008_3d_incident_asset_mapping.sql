-- ==============================================================================
-- CAMPUSOPS MIGRATION: 20261030000008_3d_incident_asset_mapping.sql
-- PURPOSE: 3D Incident & Exact Asset-Level Location Mapping
-- ==============================================================================

-- 1. Extend incidents table with precise asset mapping and photo annotation coordinates
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS asset_name TEXT,
  ADD COLUMN IF NOT EXISTS asset_category TEXT,
  ADD COLUMN IF NOT EXISTS annotation_coordinates JSONB,
  ADD COLUMN IF NOT EXISTS mapped_location_level TEXT DEFAULT 'building' CHECK (mapped_location_level IN ('building', 'floor', 'room', 'asset'));

-- Index for rapid asset-level queries
CREATE INDEX IF NOT EXISTS idx_incidents_asset_id ON public.incidents(asset_id);
CREATE INDEX IF NOT EXISTS idx_incidents_location_level ON public.incidents(mapped_location_level);

-- 2. Create assets registry table if not exists for physical twin synchronization
CREATE TABLE IF NOT EXISTS public.campus_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor TEXT NOT NULL,
  room TEXT NOT NULL,
  photo_url TEXT,
  annotation_coordinates JSONB,
  position_3d JSONB,
  serial_number TEXT,
  install_date DATE,
  last_serviced_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on campus_assets
ALTER TABLE public.campus_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on campus_assets"
  ON public.campus_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow facilities staff to manage campus_assets"
  ON public.campus_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('coo', 'director', 'engineer')
    )
  );

COMMENT ON COLUMN public.incidents.annotation_coordinates IS 'Normalized photo x, y percentage coordinates (0-100) for pinpoint equipment inspection';
COMMENT ON COLUMN public.incidents.mapped_location_level IS 'Granularity of verified location: building, floor, room, or exact asset';

