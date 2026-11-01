const BASE_URL = 'http://localhost:5000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as any),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function runLiveVerification() {
  console.log('=== CAMPUSOPS LIVE RUNTIME VERIFICATION (PORT 5000) ===\n');

  // Health
  console.log('1. Checking /api/health:');
  const health = await req('/api/health');
  console.log('Status:', health.status);
  console.log('Response:', JSON.stringify(health.body, null, 2));

  // A. Incidents
  console.log('\n--- A. Incidents ---');
  const incPayload = {
    title: 'Burst pipe flooding corridor',
    description: 'Main copper riser burst on 2nd floor academic complex corridor',
    category: 'Plumbing',
    severity: 'critical',
    safetyRisk: 'high',
    disruptionLevel: 'severe',
    peopleAffected: 50,
    buildingId: 'ACB',
    roomText: 'Corridor 2B'
  };
  const incCreate = await req('/api/incidents', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-staff' },
    body: JSON.stringify(incPayload)
  });
  console.log('POST /api/incidents Status:', incCreate.status);
  console.log('Created Incident:', JSON.stringify(incCreate.body, null, 2));

  const incList = await req('/api/incidents', {
    headers: { Authorization: 'Bearer demo-token-coo' }
  });
  console.log('GET /api/incidents Source:', incList.body?.message || incList.body?.source);

  // B. Work Orders
  console.log('\n--- B. Work Orders & Duplicate Prevention ---');
  const incId = incCreate.body?.incident?.id || 'inc-burst-001';
  const woPayload = {
    incidentId: incId,
    title: 'Weld burst copper riser 2nd floor',
    category: 'Plumbing',
    buildingId: 'ACB',
    location: 'Corridor 2B',
    priority: 'urgent',
    assignedEngineer: 'Vikram Sundaram'
  };
  const wo1 = await req('/api/work-orders', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-engineer' },
    body: JSON.stringify(woPayload)
  });
  console.log('POST /api/work-orders (First) Status:', wo1.status);
  console.log('WO 1 Result:', JSON.stringify(wo1.body, null, 2));

  // Duplicate WO attempt
  const woDup = await req('/api/work-orders', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-engineer' },
    body: JSON.stringify({
      incidentId: incId,
      title: 'Second WO for same burst pipe',
      category: 'Plumbing',
      buildingId: 'ACB',
      priority: 'high'
    })
  });
  console.log('POST /api/work-orders (Duplicate) Status:', woDup.status);
  console.log('Duplicate Prevention Response:', JSON.stringify(woDup.body, null, 2));

  // C. Inventory
  console.log('\n--- C. Inventory: Stock Allocation & Negative Prevention ---');
  const invList = await req('/api/inventory', {
    headers: { Authorization: 'Bearer demo-token-coo' }
  });
  console.log('GET /api/inventory Source:', invList.body?.source);
  const testItem = invList.body?.items?.[0] || { sku: 'ELE-LED-004', name: 'LED Panel', currentStock: 8 };
  console.log(`Test Item SKU: ${testItem.sku}, Current Stock: ${testItem.currentStock}`);

  // Normal Allocation
  const allocOk = await req('/api/inventory/allocate', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-engineer' },
    body: JSON.stringify({
      sku: testItem.sku,
      quantity: 1,
      workOrderId: wo1.body?.workOrder?.id || 'wo-101'
    })
  });
  console.log('POST /api/inventory/allocate (Valid) Status:', allocOk.status);
  console.log('Allocation Response:', JSON.stringify(allocOk.body, null, 2));

  // Negative Stock Allocation
  const allocNeg = await req('/api/inventory/allocate', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-engineer' },
    body: JSON.stringify({
      sku: testItem.sku,
      quantity: 999999,
      workOrderId: 'wo-test'
    })
  });
  console.log('POST /api/inventory/allocate (Negative Attempt) Status:', allocNeg.status);
  console.log('Negative Stock Prevention Response:', JSON.stringify(allocNeg.body, null, 2));

  // Idempotent goods receipt
  const token = `LIVE-TEST-GRN-${Date.now()}`;
  const rcv1 = await req('/api/inventory/receive', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-engineer' },
    body: JSON.stringify({ sku: testItem.sku, quantity: 5, receiptToken: token })
  });
  console.log('POST /api/inventory/receive (1st) Status:', rcv1.status, 'isIdempotentReplay:', rcv1.body?.isIdempotentReplay);

  const rcv2 = await req('/api/inventory/receive', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-engineer' },
    body: JSON.stringify({ sku: testItem.sku, quantity: 5, receiptToken: token })
  });
  console.log('POST /api/inventory/receive (2nd replay) Status:', rcv2.status, 'isIdempotentReplay:', rcv2.body?.isIdempotentReplay);

  // D. Room Bookings
  console.log('\n--- D. Room Bookings: Maintenance Exclusion & Overlap ---');
  // Maintenance Exclusion
  const bookMaint = await req('/api/bookings', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-faculty' },
    body: JSON.stringify({
      roomCode: 'I101',
      title: 'Session in Damaged Hall',
      eventType: 'lecture',
      startTime: '2026-11-01 10:00:00',
      endTime: '2026-11-01 11:30:00',
      expectedAttendees: 30
    })
  });
  console.log('POST /api/bookings (Maintenance Room) Status:', bookMaint.status);
  console.log('Maintenance Exclusion Response:', JSON.stringify(bookMaint.body, null, 2));

  // Normal Booking
  const startTime = `2026-11-10T14:00:00.000Z`;
  const endTime = `2026-11-10T16:00:00.000Z`;
  const bookValid = await req('/api/bookings', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-faculty' },
    body: JSON.stringify({
      roomCode: 'B301',
      roomName: 'Lecture Hall 301',
      title: 'Machine Learning Colloquium',
      eventType: 'lecture',
      startTime,
      endTime,
      expectedAttendees: 60
    })
  });
  console.log('POST /api/bookings (Valid) Status:', bookValid.status);

  // Overlapping Booking
  const bookOverlap = await req('/api/bookings', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-faculty' },
    body: JSON.stringify({
      roomCode: 'B301',
      title: 'Colliding Robotics Workshop',
      eventType: 'lab_session',
      startTime,
      endTime,
      expectedAttendees: 40
    })
  });
  console.log('POST /api/bookings (Collision) Status:', bookOverlap.status);
  console.log('Collision Prevention Response:', JSON.stringify(bookOverlap.body, null, 2));

  // E. Approvals & Anti-Self-Approval
  console.log('\n--- E. Approvals & Anti-Self-Approval ---');
  // app-002 requesterId is 'demo-director-002'
  const selfApprove = await req('/api/approvals/app-002/review', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer demo-token-director' }, // Director id is 'demo-director-002'
    body: JSON.stringify({ status: 'approved' })
  });
  console.log('Self-Approval Attempt on app-002 Status:', selfApprove.status);
  console.log('Self-Approval Response:', JSON.stringify(selfApprove.body, null, 2));

  // Independent approval of app-001 (requester is Vikram Sundaram)
  const indepApprove = await req('/api/approvals/app-001/review', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer demo-token-coo' }, // COO id is 'demo-coo-001'
    body: JSON.stringify({ status: 'approved' })
  });
  console.log('Independent Approval of app-001 Status:', indepApprove.status);
  console.log('Independent Approval Response:', JSON.stringify(indepApprove.body, null, 2));

  // F. Notifications
  console.log('\n--- F. Notifications ---');
  const notifs = await req('/api/notifications', {
    headers: { Authorization: 'Bearer demo-token-coo' }
  });
  console.log('GET /api/notifications Status:', notifs.status, 'Count:', notifs.body?.notifications?.length);

  const markAll = await req('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: { Authorization: 'Bearer demo-token-coo' }
  });
  console.log('POST /api/notifications/mark-all-read Status:', markAll.status);

  // G. Occupancy
  console.log('\n--- G. Occupancy & Sensor Telemetry ---');
  const occ = await req('/api/occupancy', {
    headers: { Authorization: 'Bearer demo-token-coo' }
  });
  console.log('GET /api/occupancy Status:', occ.status);
  console.log('Occupancy Source:', occ.body?.source || 'in-memory demo');
  console.log('Sample Room Occupancy:', JSON.stringify(occ.body?.classrooms?.[0] || occ.body?.data?.[0], null, 2));
}

runLiveVerification().catch(console.error);

