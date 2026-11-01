import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Building2, MapPin, CheckSquare, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Room } from '../../types';

const COMMON_EQUIPMENT = [
  'Projector',
  'Audio System',
  'Smart Board',
  'Video Conferencing',
  'High-Spec Workstations',
  'LAN Ports',
  'Whiteboard',
  'Podium Mic',
  'Robotics Bench',
];

export default function CreateBookingModal() {
  const {
    isCreateBookingOpen,
    setIsCreateBookingOpen,
    rooms,
    buildings,
    user,
    createBooking,
    checkBookingConflict,
    selectedBuildingId,
  } = useCampus();

  const [buildingId, setBuildingId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [date, setDate] = useState<string>('2026-10-30');
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('15:30');
  const [purpose, setPurpose] = useState<string>('');
  const [department, setDepartment] = useState<string>(user.department || 'Academic Affairs');
  const [expectedAttendance, setExpectedAttendance] = useState<number>(35);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Projector', 'Audio System']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize building and room when opened
  useEffect(() => {
    if (isCreateBookingOpen) {
      const initialBuilding = selectedBuildingId || (buildings.length > 0 ? buildings[0].id : 'main-block');
      setBuildingId(initialBuilding);
      const availableRooms = rooms.filter((r) => r.buildingId === initialBuilding && r.status !== 'disrupted');
      if (availableRooms.length > 0) {
        setRoomId(availableRooms[0].id);
      } else {
        const anyAvailable = rooms.find((r) => r.status !== 'disrupted');
        if (anyAvailable) {
          setRoomId(anyAvailable.id);
          setBuildingId(anyAvailable.buildingId);
        }
      }
      setErrorMsg(null);
    }
  }, [isCreateBookingOpen, selectedBuildingId, buildings, rooms]);

  // Update room when building changes
  const handleBuildingChange = (bId: string) => {
    setBuildingId(bId);
    const bRooms = rooms.filter((r) => r.buildingId === bId && r.status !== 'disrupted');
    if (bRooms.length > 0) {
      setRoomId(bRooms[0].id);
    } else {
      setRoomId('');
    }
    setErrorMsg(null);
  };

  const selectedRoom: Room | undefined = rooms.find((r) => r.id === roomId);

  // Live conflict detection check
  const conflictCheck = roomId
    ? checkBookingConflict(roomId, date, startTime, endTime)
    : { hasConflict: false };

  // Live capacity validation
  const isOverCapacity = selectedRoom ? expectedAttendance > selectedRoom.capacity : false;

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!roomId || !selectedRoom) {
      setErrorMsg('Please select an available room');
      return;
    }

    if (!purpose.trim()) {
      setErrorMsg('Please specify the booking purpose');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('End time must be after start time');
      return;
    }

    if (isOverCapacity) {
      setErrorMsg(`Expected attendance exceeds room capacity (${selectedRoom.capacity} seats)`);
      return;
    }

    if (conflictCheck.hasConflict && conflictCheck.conflictingBooking) {
      const c = conflictCheck.conflictingBooking;
      setErrorMsg(`Conflict: Room already booked for "${c.purpose}" (${c.startTime} - ${c.endTime})`);
      return;
    }

    const result = await createBooking({
      roomId: selectedRoom.id,
      roomCode: selectedRoom.roomNumber,
      roomName: selectedRoom.name,
      buildingId: selectedRoom.buildingId,
      buildingName: selectedRoom.buildingName,
      date,
      startTime,
      endTime,
      purpose,
      expectedAttendance,
      requiredEquipment: selectedEquipment,
      bookedBy: user.name,
      bookedByRole: user.role,
      department,
      status: selectedRoom.capacity >= 80 ? 'pending' : 'approved',
    });

    if (result.success) {
      setIsCreateBookingOpen(false);
      // Reset form
      setPurpose('');
    } else {
      setErrorMsg(result.message);
    }
  };

  if (!isCreateBookingOpen) return null;

  const filteredRooms = rooms.filter((r) => !buildingId || r.buildingId === buildingId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24283B]/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E7E2DD] shadow-pastel-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7E2DD] bg-[#FAF7F1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E6E9FF] border border-[#CAD2FC] flex items-center justify-center text-[#6878CA]">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-space font-bold text-lg text-[#24283B]">Reserve a Campus Space</h2>
              <p className="font-jakarta text-xs text-[#74788C]">
                Book lecture halls, laboratories, or seminar suites with automatic conflict verification
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateBookingOpen(false)}
            className="p-2 rounded-xl text-[#74788C] hover:bg-[#E7E2DD] hover:text-[#24283B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#F8DCE8] border border-[#BA3D6E]/30 flex items-center gap-2.5 text-xs font-jakarta text-[#8A2252]">
              <AlertTriangle size={16} className="flex-shrink-0 text-[#BA3D6E]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Location: Building & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#6878CA]" /> Campus Building
              </label>
              <select
                value={buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#2E8B67]" /> Room / Venue
              </label>
              <select
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
              >
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.status === 'disrupted'}>
                    {r.roomNumber} - {r.name} ({r.capacity} seats) {r.status === 'disrupted' ? '[DISRUPTED]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Room Details Preview */}
          {selectedRoom && (
            <div className="p-3.5 rounded-2xl bg-[#F6F0E5] border border-[#E7E2DD] flex items-center justify-between gap-3 text-xs font-jakarta">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-space font-bold text-[#24283B] text-sm">{selectedRoom.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[#6878CA] font-semibold text-[10px] border border-[#E7E2DD]">
                    {selectedRoom.roomType.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-[#74788C]">· {selectedRoom.floor}</span>
                </div>
                <p className="text-[#74788C] text-[11px]">
                  Facilities: {selectedRoom.facilities.slice(0, 3).join(', ')}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="font-space font-bold text-sm text-[#24283B]">{selectedRoom.capacity}</span>
                <span className="text-[#74788C] text-[11px] block">Max Capacity</span>
              </div>
            </div>
          )}

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#6878CA]" /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
              />
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-[#6878CA]" /> Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
              />
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-[#6878CA]" /> End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
              />
            </div>
          </div>

          {/* Conflict Alert Status */}
          {conflictCheck.hasConflict && conflictCheck.conflictingBooking ? (
            <div className="p-3 rounded-2xl bg-[#FFF2E7] border border-[#C06B33]/40 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-[#C06B33] flex-shrink-0 mt-0.5" />
              <div className="text-xs font-jakarta">
                <p className="font-bold text-[#C06B33]">Schedule Conflict Detected</p>
                <p className="text-[#74788C] mt-0.5">
                  Overlaps with <strong>{conflictCheck.conflictingBooking.bookingNumber}</strong>: &quot;
                  {conflictCheck.conflictingBooking.purpose}&quot; ({conflictCheck.conflictingBooking.startTime} -{' '}
                  {conflictCheck.conflictingBooking.endTime}). Choose another time slot or room.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#E9F9F2] border border-[#2E8B67]/30 flex items-center gap-2 text-xs font-jakarta text-[#2E8B67]">
              <ShieldCheck size={15} />
              <span>Time slot is currently conflict-free and available for reservation.</span>
            </div>
          )}

          {/* Purpose & Attendance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5">
                Session Title / Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Computing Lab Practical Batch B"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] placeholder:text-[#74788C] bg-white focus:outline-none focus:border-[#6878CA]"
              />
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Users size={13} className="text-[#C06B33]" /> Attendance
              </label>
              <input
                type="number"
                min="1"
                max={selectedRoom ? selectedRoom.capacity : 500}
                value={expectedAttendance}
                onChange={(e) => setExpectedAttendance(parseInt(e.target.value) || 1)}
                className={`w-full px-3.5 py-2.5 rounded-xl border font-jakarta text-xs text-[#24283B] bg-white focus:outline-none ${
                  isOverCapacity ? 'border-[#BA3D6E] bg-[#FDF0F6]' : 'border-[#E7E2DD] focus:border-[#6878CA]'
                }`}
              />
              {isOverCapacity && (
                <p className="text-[11px] font-jakarta text-[#BA3D6E] mt-1 font-semibold">
                  Exceeds room capacity ({selectedRoom?.capacity})
                </p>
              )}
            </div>
          </div>

          {/* Required Equipment Checkboxes */}
          <div>
            <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-2 flex items-center gap-1.5">
              <CheckSquare size={13} className="text-[#6878CA]" /> Requested Equipment & Facilities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_EQUIPMENT.map((eq) => {
                const isSelected = selectedEquipment.includes(eq);
                return (
                  <button
                    type="button"
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left font-jakarta text-xs transition-all border ${
                      isSelected
                        ? 'bg-[#E6E9FF] border-[#CAD2FC] text-[#6878CA] font-semibold'
                        : 'bg-[#FAF7F1] border-[#E7E2DD] text-[#74788C] hover:bg-white'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isSelected ? 'bg-[#6878CA] border-[#6878CA] text-white' : 'border-[#CAD2FC] bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 size={11} />}
                    </div>
                    <span className="truncate">{eq}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E2DD] bg-[#FAF7F1]">
          <button
            type="button"
            onClick={() => setIsCreateBookingOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-xs text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isOverCapacity || conflictCheck.hasConflict || !roomId || !purpose.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-xs hover:bg-[#383E58] disabled:opacity-50 transition-all shadow-pastel-sm flex items-center gap-2"
          >
            <CheckCircle2 size={14} />
            Confirm Reservation
          </button>
        </div>
      </div>
    </div>
  );
}
