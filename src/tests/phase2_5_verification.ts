import { api } from '../services/api';
import { DEMO_ROOMS, DEMO_ROOM_BOOKINGS, DEMO_ROOM_DISRUPTIONS, DEMO_INVENTORY_ITEMS } from '../data/demoData';
import { CAMPUS_BUILDINGS } from '../data/buildingsData';
import { RoomBooking, Room } from '../types';

async function runPhase25Tests() {
  console.log('============================================================');
  console.log('   CampusOps Phase 2.5 Verification & Regression Test Suite   ');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // TEST SUITE 1: Room Catalogue & Campus Buildings
  console.log('--- Test Suite 1: Room Catalogue & Campus Facilities ---');
  const rooms = await api.getRooms();
  assert(rooms.length >= 15, `Rooms mapped across campus (${rooms.length} rooms)`);
  
  const buildingIds = new Set(rooms.map(r => r.buildingId));
  assert(buildingIds.size === CAMPUS_BUILDINGS.length, `All ${CAMPUS_BUILDINGS.length} campus buildings have mapped rooms`);

  const hasLabsAndHalls = rooms.some(r => r.roomType === 'laboratory') && rooms.some(r => r.roomType === 'lecture_hall');
  assert(hasLabsAndHalls, 'Room catalogue contains diverse room types (laboratories, lecture halls, auditoriums)');

  const hasEquipment = rooms.every(r => r.equipment && r.equipment.length > 0);
  assert(hasEquipment, 'All room records have detailed equipment and facility tags');

  // TEST SUITE 2: Double-Booking & Conflict Detection
  console.log('\n--- Test Suite 2: Conflict Detection & Overlap Prevention ---');
  const existingBookings = [...DEMO_ROOM_BOOKINGS];
  
  // Existing: BK-2026-003 is on '2026-10-30', 'room-it-lab-301', 10:00 - 13:00
  const conflict1 = api.checkBookingConflict('room-it-lab-301', '2026-10-30', '10:00', '13:00', existingBookings);
  assert(conflict1.hasConflict, 'Exact match time conflict detected and blocked', `Conflicted with ${conflict1.conflictingBooking?.bookingNumber}`);

  const conflict2 = api.checkBookingConflict('room-it-lab-301', '2026-10-30', '11:00', '12:00', existingBookings);
  assert(conflict2.hasConflict, 'Enclosed subset time slot conflict detected and blocked');

  const conflict3 = api.checkBookingConflict('room-it-lab-301', '2026-10-30', '09:30', '11:30', existingBookings);
  assert(conflict3.hasConflict, 'Overlapping partial window (starts earlier) detected and blocked');

  const conflict4 = api.checkBookingConflict('room-it-lab-301', '2026-10-30', '12:30', '14:00', existingBookings);
  assert(conflict4.hasConflict, 'Overlapping partial window (ends later) detected and blocked');

  // Non-conflicting: Adjacent time slot
  const noConflict1 = api.checkBookingConflict('room-it-lab-301', '2026-10-30', '13:00', '15:00', existingBookings);
  assert(!noConflict1.hasConflict, 'Adjacent non-overlapping time slot allowed (13:00 - 15:00)');

  // Non-conflicting: Different date
  const noConflict2 = api.checkBookingConflict('room-it-lab-301', '2026-10-31', '10:00', '13:00', existingBookings);
  assert(!noConflict2.hasConflict, 'Same time on different date allowed');

  // Non-conflicting: Different room
  const noConflict3 = api.checkBookingConflict('room-it-lab-302', '2026-10-30', '10:00', '13:00', existingBookings);
  assert(!noConflict3.hasConflict, 'Same time in another available room allowed');

  // TEST SUITE 3: Intelligent Alternative Room Recommendation
  console.log('\n--- Test Suite 3: Alternative Room Recommendation Engine ---');
  // Disrupted session: BK-2026-001 in Seminar Hall B (IT-02), 55 pax, required: Projector, Audio System, Podium Mic
  const targetBooking = existingBookings.find(b => b.id === 'bk-001')!;
  assert(!!targetBooking, 'Target affected booking found for recommendation test');

  const recommendations = api.recommendAlternativeRooms(targetBooking, rooms, existingBookings);
  assert(recommendations.length > 0, `Generated ${recommendations.length} viable alternative recommendations`);

  // Verify rules
  const containsDisrupted = recommendations.some(r => r.room.id === targetBooking.roomId || r.room.status === 'disrupted');
  assert(!containsDisrupted, 'Recommendation engine strictly excludes the disrupted room');

  const allFitCapacity = recommendations.every(r => r.room.capacity >= targetBooking.expectedAttendance!);
  assert(allFitCapacity, 'All recommendations strictly satisfy capacity requirement (capacity >= 55)');

  const topMatch = recommendations[0];
  assert(topMatch.score >= 120, `Top recommended room scored high match index (${topMatch.score}%)`);
  assert(topMatch.matchReasons.length >= 2, `Transparent match rationale provided (${topMatch.matchReasons.join('; ')})`);

  // TEST SUITE 4: Booking Creation API
  console.log('\n--- Test Suite 4: Booking Creation & Reservation ---');
  const newBookingData = {
    roomId: 'room-mb-102',
    roomCode: 'MB-102',
    roomName: 'Syndicate Room 102',
    buildingId: 'main-block',
    buildingName: 'Main Administrative Block',
    date: '2026-10-30',
    startTime: '17:00',
    endTime: '18:30',
    purpose: 'Smart Campus AI Working Group',
    expectedAttendance: 25,
    requiredEquipment: ['Projector', 'Smart Board'],
    bookedBy: 'Dr. Jennifer Rao',
    bookedByRole: 'Chief Operations Officer',
    department: 'Office of Campus Infrastructure & Strategic Operations',
    status: 'approved' as const,
  };

  const createdBooking = await api.createBooking(newBookingData);
  assert(createdBooking.success && Boolean(createdBooking.booking), `Booking creation returned a successful API result${createdBooking.error ? `: ${createdBooking.error}` : ''}`);
  if (createdBooking.booking) {
    assert(Boolean(createdBooking.booking.bookingNumber || createdBooking.booking.bookingCode), 'Created booking has an identifier');
    assert(['pending', 'approved', 'confirmed'].includes(createdBooking.booking.status), 'Booking status verified');
  }

  // TEST SUITE 5: Regression & Baseline Preservation
  console.log('\n--- Test Suite 5: Phase 2.3 & 2.4 Baseline Preservation ---');
  assert(DEMO_INVENTORY_ITEMS.length > 0, 'Phase 2.4 inventory items intact');
  const inventoryApi = await api.getInventoryItems();
  assert(inventoryApi.length === DEMO_INVENTORY_ITEMS.length, `Inventory API returns all ${inventoryApi.length} items`);
  assert(CAMPUS_BUILDINGS.length === 7, '7 campus buildings intact from initial backup');

  console.log('\n============================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase25Tests();
