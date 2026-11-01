-- Idempotent starter records for the workflows added after the original demo seed.
-- This migration is prepared for the project's normal local/deployment migration flow.
-- It has not been applied to any remote Supabase project.

-- Room booking defaults: use rooms without seeded active disruptions and times that
-- stay in the future whenever the seed is rerun.
INSERT INTO public.room_bookings (
  room_id, booking_code, room_code, room_name, building_id, building_name,
  title, purpose, event_type, start_time, end_time, booking_date,
  attendee_count, expected_attendance, booked_by, organizer_name,
  booked_by_role, department, requires_approval, status, notes
)
SELECT
  r.id, 'BK-2026-DEMO-001', r.room_code, r.name, r.building_id, b.name,
  'Campus Operations Planning', 'Weekly campus operations planning meeting', 'meeting',
  ((CURRENT_DATE + 1) + TIME '10:00')::timestamptz,
  ((CURRENT_DATE + 1) + TIME '11:00')::timestamptz, CURRENT_DATE + 1,
  18, 18, NULL, 'Campus Operations Team', 'department_manager',
  'Campus Operations', FALSE, 'confirmed', 'Demonstration booking record.'
FROM public.rooms r
JOIN public.buildings b ON b.id = r.building_id
WHERE r.id = 'b1000000-0000-0000-0000-000000000003'
  AND NOT EXISTS (SELECT 1 FROM public.room_bookings WHERE booking_code = 'BK-2026-DEMO-001');

INSERT INTO public.room_bookings (
  room_id, booking_code, room_code, room_name, building_id, building_name,
  title, purpose, event_type, start_time, end_time, booking_date,
  attendee_count, expected_attendance, booked_by, organizer_name,
  booked_by_role, department, requires_approval, status, notes
)
SELECT
  r.id, 'BK-2026-DEMO-002', r.room_code, r.name, r.building_id, b.name,
  'Student Project Review', 'Review of student capstone project milestones', 'meeting',
  ((CURRENT_DATE + 1) + TIME '13:00')::timestamptz,
  ((CURRENT_DATE + 1) + TIME '14:30')::timestamptz, CURRENT_DATE + 1,
  24, 24, NULL, 'Student Affairs Team', 'student_faculty',
  'Student Affairs', FALSE, 'confirmed', 'Demonstration booking record.'
FROM public.rooms r
JOIN public.buildings b ON b.id = r.building_id
WHERE r.id = 'b1000000-0000-0000-0000-000000000007'
  AND NOT EXISTS (SELECT 1 FROM public.room_bookings WHERE booking_code = 'BK-2026-DEMO-002');

-- Requisition defaults reference the inventory already present in seed_data.sql.
INSERT INTO public.procurement_requests (
  request_number, item_id, item_sku, item_name, category, quantity, unit,
  estimated_unit_cost, total_estimated_cost, supplier_name, supplier_contact,
  urgency, status, reason, rule_trigger_reason, requested_by, approval_id
)
SELECT
  'PR-2026-DEMO-001', i.id, i.sku, i.item_name, i.category, 12, i.unit,
  i.unit_cost, i.unit_cost * 12, 'Campus Supply Partners', 'orders@campussupply.example',
  'high', 'pending_approval',
  'Restock to support scheduled campus repairs and maintain minimum stock levels.',
  'Current stock is below the configured minimum threshold.',
  'Procurement Demo Requester', 'a1000000-0000-0000-0000-000000000002'
FROM public.inventory_items i
WHERE i.sku = 'CAB-CAT6-1000'
ON CONFLICT (request_number) DO NOTHING;

INSERT INTO public.procurement_requests (
  request_number, item_id, item_sku, item_name, category, quantity, unit,
  estimated_unit_cost, total_estimated_cost, supplier_name, supplier_contact,
  urgency, status, reason, requested_by
)
SELECT
  'PR-2026-DEMO-002', i.id, i.sku, i.item_name, i.category, 6, i.unit,
  i.unit_cost, i.unit_cost * 6, 'Regional Facilities Supply', 'service@regionalfacilities.example',
  'medium', 'draft',
  'Planned reserve for routine maintenance and semester room preparation.',
  'Procurement Demo Requester'
FROM public.inventory_items i
WHERE i.sku = 'FLT-RO-MEM-400'
ON CONFLICT (request_number) DO NOTHING;

-- Occupancy starters are timetable/manual snapshots, never claimed as live sensors
-- or faculty check-ins. Re-running this seed does not duplicate existing rooms.
INSERT INTO public.classroom_occupancy_records (
  room_code, room_name, building_id, floor, capacity, equipment,
  status, data_source, confidence_level, current_class, upcoming_classes,
  last_updated
)
SELECT seed.room_code, seed.room_name, seed.building_id, seed.floor, seed.capacity,
       seed.equipment, seed.status::occupancy_status, seed.data_source::occupancy_data_source,
       seed.confidence_level, NULL, seed.upcoming_classes::jsonb, NOW()
FROM (VALUES
  ('A101', 'Smart Lecture Hall 101', 'architecture-block', 0, 65, ARRAY['4K Projector','Microphone','Smart Podium']::text[], 'scheduled', 'timetable', 'medium', '[{"courseCode":"CS301","courseName":"Data Structures","facultyName":"Dr. Anand Raman","startTime":"10:00","endTime":"11:30"}]'),
  ('A102', 'Interactive Classroom 102', 'architecture-block', 0, 45, ARRAY['Interactive Display','Lecture Capture','AC']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('A103', 'General Lecture Room 103', 'architecture-block', 0, 55, ARRAY['Projector','Whiteboard','Speakers']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('A104', 'Applied Electronics Lab 104', 'architecture-block', 1, 36, ARRAY['Oscilloscopes','Function Generators','Fume Extractor']::text[], 'unknown', 'manual_inspection', 'low', '[]'),
  ('A105', 'Mechatronics Systems Lab 105', 'architecture-block', 1, 32, ARRAY['Robotic Arms','PLC Trainers','Safety Equipment']::text[], 'under_maintenance', 'manual_inspection', 'medium', '[]'),
  ('FY-201', 'Physics Lecture Room 201', 'first-year-block', 1, 70, ARRAY['Projector','Lecture Capture']::text[], 'scheduled', 'timetable', 'medium', '[{"courseCode":"PH201","courseName":"Applied Physics","facultyName":"Prof. K. Venkatesh","startTime":"09:00","endTime":"10:30"}]'),
  ('FY-202', 'Foundations Classroom 202', 'first-year-block', 1, 50, ARRAY['Display','Whiteboard','AC']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('FY-302', 'Smart Lecture Hall 302', 'first-year-block', 3, 75, ARRAY['Projector','Lecture Capture']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('FY-303', 'Seminar Room 303', 'first-year-block', 3, 40, ARRAY['Video Conferencing','Display']::text[], 'unknown', 'manual_inspection', 'low', '[]'),
  ('IT-401', 'Advanced Computing Lab 401', 'it-block', 4, 50, ARRAY['Workstations','Dual Displays','UPS']::text[], 'scheduled', 'timetable', 'medium', '[{"courseCode":"CS412","courseName":"Cloud Systems","facultyName":"Prof. K. Senthil","startTime":"09:00","endTime":"11:00"}]'),
  ('IT-402', 'Network Teaching Lab 402', 'it-block', 4, 35, ARRAY['Workstations','Network Racks','Projector']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('IT-403', 'Systems Programming Lab', 'it-block', 4, 60, ARRAY['Computers','Projector']::text[], 'scheduled', 'timetable', 'medium', '[{"courseCode":"CS305","courseName":"Systems Programming","facultyName":"Dr. Meera Krishnan","startTime":"10:00","endTime":"11:00"}]'),
  ('IT-404', 'Server Annex Lab 404', 'it-block', 4, 20, ARRAY['Server Racks','Precision Cooling','UPS']::text[], 'under_maintenance', 'manual_inspection', 'medium', '[]'),
  ('ME-101', 'Mechanical Design Studio 101', 'mechanical-block', 0, 45, ARRAY['CAD Workstations','Projector']::text[], 'scheduled', 'timetable', 'medium', '[{"courseCode":"ME205","courseName":"Machine Design","facultyName":"Prof. S. Natarajan","startTime":"11:00","endTime":"12:30"}]'),
  ('ME-102', 'Mechatronics & Fabrication Bay', 'mechanical-block', 0, 50, ARRAY['Workshop Benches','Safety Equipment']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('ME-103', 'Robotics Workshop 103', 'mechanical-block', 0, 30, ARRAY['Robotic Arms','Tooling Benches','Safety Equipment']::text[], 'under_maintenance', 'manual_inspection', 'medium', '[]'),
  ('LIB-201', 'Digital Research & Study Suite', 'central-library', 2, 40, ARRAY['Computers','Wi-Fi','Power Outlets']::text[], 'available', 'manual_inspection', 'medium', '[]'),
  ('ADM-101', 'Administration Training Room', 'main-block', 1, 30, ARRAY['Display','Video Conferencing','Whiteboard']::text[], 'scheduled', 'timetable', 'medium', '[{"courseCode":"OPS110","courseName":"Campus Safety Briefing","facultyName":"Campus Operations","startTime":"14:00","endTime":"15:00"}]')
) AS seed(room_code, room_name, building_id, floor, capacity, equipment, status, data_source, confidence_level, upcoming_classes)
WHERE EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = seed.building_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.classroom_occupancy_records existing
    WHERE existing.room_code = seed.room_code AND existing.building_id = seed.building_id
  );
