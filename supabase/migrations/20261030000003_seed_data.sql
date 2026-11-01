-- =====================================================================
-- CAMPUSOPS — MIGRATION 003: SEED DATA
-- Phase 2 Backend Foundation — Preserving MNMJEC Campus Data Fidelity
-- Revised: 100% Valid Hexadecimal UUIDs across all tables & Foreign Keys
-- 100% Idempotent
-- =====================================================================

-- 1. Seed Departments
INSERT INTO public.departments (id, name, code, contact_email)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'Office of Campus Infrastructure & Strategic Operations', 'INFRA', 'coo@campusops.edu'),
    ('d1000000-0000-0000-0000-000000000002', 'Facility Engineering & Maintenance', 'FAC-ENG', 'facilities@campusops.edu'),
    ('d1000000-0000-0000-0000-000000000003', 'Department of Computing & IT Services', 'ITS', 'it-support@campusops.edu'),
    ('d1000000-0000-0000-0000-000000000004', 'Electrical & Power Systems Management', 'POWER', 'power@campusops.edu'),
    ('d1000000-0000-0000-0000-000000000005', 'Civil Works, Water & Grounds Management', 'CIVIL', 'civil@campusops.edu')
ON CONFLICT (name) DO UPDATE SET
    code = EXCLUDED.code,
    contact_email = EXCLUDED.contact_email;

-- 2. Seed Campus Buildings (Exact match to Phase 1 buildingsData.ts and 3D geometry coordinates)
INSERT INTO public.buildings (id, name, short_name, code, category, floors, health_score, position_x, position_y, position_z)
VALUES
    ('main-block', 'Main Administrative Block', 'Main Block', 'MB-01', 'Administrative', 'G+1', 94, 0.0, 0.0, 0.0),
    ('it-block', 'Department of Computing & IT', 'IT Block', 'IT-02', 'Academic', 'G+4', 82, -25.0, 0.0, -35.0),
    ('mechanical-block', 'Mechanical & Robotics Center', 'Mech Block', 'ME-03', 'Academic', 'G+2', 88, 40.0, 0.0, -20.0),
    ('civil-block', 'Civil & Environmental Engineering', 'Civil Block', 'CE-04', 'Academic', 'G+2', 96, 35.0, 0.0, 30.0),
    ('first-year-block', 'Science & Humanities Freshman Wing', 'First Year Block', 'FY-05', 'Academic', 'G+3', 91, -30.0, 0.0, 25.0),
    ('architecture-block', 'MNM School of Architecture', 'Architecture Block', 'AR-06', 'Academic', 'G+2', 98, 55.0, 0.0, -60.0),
    ('central-library', 'Central Information & Library Complex', 'Central Library', 'CL-07', 'Facility', 'G+2', 99, -10.0, 0.0, -65.0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    code = EXCLUDED.code,
    category = EXCLUDED.category,
    floors = EXCLUDED.floors,
    health_score = EXCLUDED.health_score,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    position_z = EXCLUDED.position_z;

-- 3. Seed Campus Rooms (b1000000-... prefix: valid hex, unique from approvals)
INSERT INTO public.rooms (id, building_id, room_code, name, floor, capacity, category, status)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'it-block', 'IT-401', 'Server Annex & Cloud Lab', '4th Floor', 25, 'Data Center / Lab', 'maintenance'),
    ('b1000000-0000-0000-0000-000000000002', 'it-block', 'IT-SEM-B', 'Seminar Hall B', '2nd Floor', 120, 'Auditorium / Seminar', 'disrupted'),
    ('b1000000-0000-0000-0000-000000000003', 'it-block', 'IT-403', 'Systems Programming Lab', '4th Floor', 60, 'Computer Lab', 'available'),
    ('b1000000-0000-0000-0000-000000000004', 'mechanical-block', 'ME-104', 'Advanced Robotics Workcell', 'Ground Floor', 40, 'Machinery Workshop', 'disrupted'),
    ('b1000000-0000-0000-0000-000000000005', 'mechanical-block', 'ME-102', 'Mechatronics & Fabrication Bay', 'Ground Floor', 50, 'Workshop', 'available'),
    ('b1000000-0000-0000-0000-000000000006', 'main-block', 'MB-AUD-1', 'Sri Ramanujam Central Auditorium', '1st Floor', 450, 'Auditorium', 'maintenance'),
    ('b1000000-0000-0000-0000-000000000007', 'main-block', 'MB-SYN-102', 'Main Syndicate Room 102', 'Ground Floor', 80, 'Conference Room', 'available'),
    ('b1000000-0000-0000-0000-000000000008', 'central-library', 'CL-ARC-01', 'Historical Archives & Manuscripts', 'Basement', 30, 'Archives', 'maintenance'),
    ('b1000000-0000-0000-0000-000000000009', 'first-year-block', 'FY-302', 'Smart Lecture Hall 302', '3rd Floor', 75, 'Lecture Hall', 'available'),
    ('b1000000-0000-0000-0000-000000000010', 'architecture-block', 'AR-ST-02', 'South Design Studio Entry', 'Ground Floor', 60, 'Design Studio', 'available')
ON CONFLICT (building_id, room_code) DO NOTHING;

-- 4. Seed Inventory Items (f1000000-... prefix: valid hex)
INSERT INTO public.inventory_items (id, sku, item_name, category, current_stock, min_threshold, unit, location, reorder_status, lead_time_days, unit_cost)
VALUES
    ('f1000000-0000-0000-0000-000000000001', 'CAB-CAT6-1000', 'Cat6 UTP Solid Copper Cable (305m Spool)', 'Networking Infrastructure', 2, 10, 'spools', 'Central Stores - Rack E2', 'critical', 2, 4016.00),
    ('f1000000-0000-0000-0000-000000000002', 'LED-T8-20W-4K', 'T8 20W 4000K Neutral White LED Fluorescent Tube', 'Electrical & Lighting', 14, 50, 'tubes', 'Central Stores - Bay 4', 'reordered', 3, 240.00),
    ('f1000000-0000-0000-0000-000000000003', 'FLT-RO-MEM-400', 'Commercial RO Membrane Cartridge 400 GPD', 'Water Treatment', 1, 6, 'units', 'Maintenance Depot 1', 'pending_approval', 5, 3800.00),
    ('f1000000-0000-0000-0000-000000000004', 'BRG-SKF-6205', 'SKF 6205-2RSH Deep Groove Ball Bearing', 'Machinery Spares', 4, 8, 'units', 'Mechanical Tool Crib A', 'optimal', 4, 650.00)
ON CONFLICT (sku) DO UPDATE SET
    current_stock = EXCLUDED.current_stock,
    min_threshold = EXCLUDED.min_threshold,
    reorder_status = EXCLUDED.reorder_status;

-- 5. Seed Incidents (c1000000-... prefix: valid hex)
INSERT INTO public.incidents (
    id, ticket_number, title, description, category, severity, status,
    building_id, floor, room_text, reporter_name, reporter_role, assigned_name,
    sla_deadline, is_demo, created_at
)
VALUES
    (
        'c1000000-0000-0000-0000-000000000001', 'INC-2401',
        'HVAC Chilled Water Loop Low Pressure in IT Block 4th Fl',
        'Compressor cycling irregularly due to pressure drop in supply header. Server lab ambient temp rising to 26°C.',
        'HVAC', 'critical', 'in_progress', 'it-block', '4th Floor', 'Server Annex 401',
        'Kavitha Raman', 'Systems Administrator', 'Vikram Sundaram (HVAC Lead)',
        NOW() + INTERVAL '1 hour 18 minutes', TRUE, NOW() - INTERVAL '42 minutes'
    ),
    (
        'c1000000-0000-0000-0000-000000000002', 'INC-2402',
        'Substation B Phase Voltage Fluctuation',
        'Phase B voltage dropping below 208V during heavy machine shop load cycle.',
        'Electrical', 'high', 'investigating', 'mechanical-block', 'Ground Floor', 'Heavy Machinery Lab',
        'Prof. S. Natarajan', 'Lab In-charge', 'M. Anand (Power Systems)',
        NOW() + INTERVAL '2 hours 45 minutes', TRUE, NOW() - INTERVAL '1 hour 15 minutes'
    ),
    (
        'c1000000-0000-0000-0000-000000000003', 'INC-2403',
        'Water Seepage Detected in Central Library Archives Room',
        'Minor drip noticed near historical manuscript collection shelf 4C after morning garden sprinkler cycle.',
        'Plumbing', 'high', 'open', 'central-library', 'Basement', 'Archives Special Collection',
        'Priya Narayanan', 'Head Archivist', NULL,
        NOW() + INTERVAL '3 hours 50 minutes', TRUE, NOW() - INTERVAL '2 hours 10 minutes'
    ),
    (
        'c1000000-0000-0000-0000-000000000004', 'INC-2404',
        'Main Auditorium Audio Mixer Ground Loop Noise',
        'Loud 60Hz hum over ceiling speaker arrays ahead of afternoon symposium.',
        'IT / Network', 'medium', 'in_progress', 'main-block', '1st Floor', 'Sri Ramanujam Auditorium',
        'Student Council President', 'Event Organizer', 'Dinesh Kumar (AV Tech)',
        NOW() + INTERVAL '1 hour 15 minutes', TRUE, NOW() - INTERVAL '2 hours 45 minutes'
    )
ON CONFLICT (ticket_number) DO NOTHING;

-- 6. Seed Work Orders (81000000-... prefix: valid hex; references incidents c1000000-...)
INSERT INTO public.work_orders (
    id, order_number, title, category, priority, status,
    incident_id, building_id, location_details, assigned_engineer_name,
    assigned_engineer_avatar, due_date, sla_remaining, completion_rate
)
VALUES
    (
        '81000000-0000-0000-0000-000000000001', 'WO-8821',
        'Re-calibrate HVAC Chiller Flow Sensor & Bypass Valve', 'HVAC Overhaul',
        'urgent', 'in_progress', 'c1000000-0000-0000-0000-000000000001',
        'it-block', '4th Floor Rooftop Mechanical Room', 'Vikram Sundaram',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        NOW() + INTERVAL '2 hours', '1h 24m', 65
    ),
    (
        '81000000-0000-0000-0000-000000000002', 'WO-8822',
        'CNC Lathe 4 Bearing & Belt Replacement', 'Machinery Maintenance',
        'high', 'awaiting_parts', 'c1000000-0000-0000-0000-000000000002',
        'mechanical-block', 'Advanced Fabrication Workshop', 'Arun Karthik',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        NOW() + INTERVAL '4 hours', '3h 54m', 40
    )
ON CONFLICT (order_number) DO NOTHING;

-- 7. Seed Work Order Parts (71000000-... prefix: valid hex; references work orders 81000000-... and inventory f1000000-...)
INSERT INTO public.work_order_parts (id, work_order_id, inventory_item_id, part_name, quantity, status)
VALUES
    ('71000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', NULL, 'Bypass Actuator 24V Belimo', 1, 'reserved'),
    ('71000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000004', 'SKF 6205-2RSH Deep Groove Ball Bearing', 2, 'needed')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Room Disruptions (91000000-... prefix: valid hex; references rooms b1000000-...)
INSERT INTO public.room_disruptions (
    id, room_id, room_code, building_name, issue, affected_schedule,
    status, alternative_room_name, resolution_eta
)
VALUES
    (
        '91000000-0000-0000-0000-000000000001',
        'b1000000-0000-0000-0000-000000000002',
        'Seminar Hall B', 'IT Block (2nd Floor)',
        'Central AC blower fault tripping primary breaker during load test',
        'Inter-College Hackathon Briefing (2:00 PM)',
        'active', 'Main Block Syndicate Room 102', '1h 45m'
    ),
    (
        '91000000-0000-0000-0000-000000000002',
        'b1000000-0000-0000-0000-000000000004',
        'Lab 104 Robotics Workcell', 'Mechanical Block (Ground Fl)',
        'High-current outlet fuse blowout during 6-axis arm commissioning',
        'Autonomous Systems Practical Batch A',
        'active', 'Lab 102 Mechatronics Bay', '45 mins'
    )
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Approvals (a1000000-... prefix: valid hex; references departments d1000000-...)
INSERT INTO public.approvals (
    id, title, category, reason, estimated_cost, urgency, status,
    requester_name, requester_role, department_id, department_name, created_at
)
VALUES
    (
        'a1000000-0000-0000-0000-000000000001',
        'Emergency Replacement: Server Annex Chilled Water Actuator',
        'HVAC Infrastructure',
        'Current Belimo actuator is binding intermittently, risking thermal trip on 40 compute servers.',
        34500.00, 'high', 'pending',
        'Vikram Sundaram', 'Senior HVAC Lead',
        'd1000000-0000-0000-0000-000000000002', 'Facility Engineering & Maintenance',
        NOW() - INTERVAL '2 hours'
    ),
    (
        'a1000000-0000-0000-0000-000000000002',
        'PO-9481: Rapid Restock of Category 6 High-Flex Spools (12 Units)',
        'IT Networking Supplies',
        'Inventory reserves critically low; 3 project laboratories require immediate structured cabling before inspection.',
        48200.00, 'high', 'pending',
        'A. Subrahmanyam', 'Network Infrastructure Mgr',
        'd1000000-0000-0000-0000-000000000003', 'Department of Computing & IT Services',
        NOW() - INTERVAL '3 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- 10. Seed AI Insights (e1000000-... prefix: valid hex)
INSERT INTO public.ai_insights (
    id, type, title, building_id, building_name, severity, summary,
    root_cause, confidence_score, recommended_action, is_active, created_at
)
VALUES
    (
        'e1000000-0000-0000-0000-000000000001',
        'repeated-complaint',
        'Repeated HVAC Thermal Spikes in 4th Floor IT Block',
        'it-block', 'IT Block', 'critical',
        '4 tickets filed across 7 days relating to air handler cycling failure and afternoon temperature rise in Lab 401 & 403.',
        'Telemetry indicates chilled water flow sensor jitter causing variable frequency drive throttle hunting.',
        94,
        'Dispatch technician with bypass valve replacement before ambient peak at 2:00 PM today.',
        TRUE, NOW() - INTERVAL '18 minutes'
    ),
    (
        'e1000000-0000-0000-0000-000000000002',
        'maintenance-risk',
        'Predictive Bearing Anomaly on Mechanical Lathe #4',
        'mechanical-block', 'Mechanical Block', 'warning',
        'Vibration frequency analysis has drifted 28% above baseline tolerance over 12 machine operating hours.',
        'Inner race micro-spalling detected; catastrophic lockup expected within 40 operating hours if unaddressed.',
        89,
        'Order SKF 6205 bearing replacement kit and schedule 90-min preventive overhaul.',
        TRUE, NOW() - INTERVAL '42 minutes'
    )
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Initial Audit Logs (Idempotent guard using target_id + action)
INSERT INTO public.audit_logs (actor_name, actor_role, action, target_type, target_id, target_label, category, badge_text, created_at)
SELECT 'Vikram Sundaram', 'HVAC Specialist', 'acknowledged urgent work order', 'work_order', 'WO-8821', 'WO-8821: Chiller Flow Sensor Calibrate', 'maintenance', 'In Progress', NOW() - INTERVAL '8 minutes'
WHERE NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE target_id = 'WO-8821' AND action = 'acknowledged urgent work order');

INSERT INTO public.audit_logs (actor_name, actor_role, action, target_type, target_id, target_label, category, badge_text, created_at)
SELECT 'Dr. Jennifer Rao', 'COO', 'approved capital expenditure for', 'approval', 'a1000000-0000-0000-0000-000000000099', 'Substation B Power Quality Stabilizer', 'approval', 'Approved', NOW() - INTERVAL '24 minutes'
WHERE NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE target_id = 'a1000000-0000-0000-0000-000000000099' AND action = 'approved capital expenditure for');

INSERT INTO public.audit_logs (actor_name, actor_role, action, target_type, target_id, target_label, category, badge_text, created_at)
SELECT 'Smart Sensor Node IT-401', 'IoT Telemetry', 'logged high thermal anomaly warning at', 'incident', 'INC-2401', 'IT Block 4th Floor Server Annex', 'incident', 'Telemetry Alert', NOW() - INTERVAL '42 minutes'
WHERE NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE target_id = 'INC-2401' AND action = 'logged high thermal anomaly warning at');
