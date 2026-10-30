import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  Users,
  Building2,
  Calendar,
  Layers,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { Room, RoomBooking, RoomType, RoomStatus, BookingStatus } from '../types';

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  lecture_hall: 'Lecture Hall',
  laboratory: 'Laboratory',
  seminar_hall: 'Seminar Hall',
  classroom: 'Classroom',
  conference_room: 'Conference Room',
  auditorium: 'Auditorium',
  workshop: 'Workshop',
};

const STATUS_BADGES: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  approved: { bg: '#E9F9F2', text: '#2E8B67', label: 'Approved' },
  pending: { bg: '#FFF2E7', text: '#C06B33', label: 'Pending Approval' },
  reallocated: { bg: '#F2F4FF', text: '#6878CA', label: 'Reallocated' },
  rejected: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Declined' },
  cancelled: { bg: '#F6F0E5', text: '#74788C', label: 'Cancelled' },
};

export default function BookingsPage() {
  const [searchParams] = useSearchParams();
  const initialBuildingParam = searchParams.get('building') || 'all';

  const {
    rooms,
    bookings,
    roomDisruptions,
    buildings,
    user,
    setIsCreateBookingOpen,
    setIsReportDisruptionOpen,
    setIsReallocateModalOpen,
    setSelectedBookingForReallocation,
    cancelBooking,
    approveBooking,
    rejectBooking,
    resolveRoomDisruption,
  } = useCampus();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'schedule' | 'catalogue' | 'bookings' | 'disruptions'>('schedule');

  // Filters
  const [selectedBuilding, setSelectedBuilding] = useState<string>(initialBuildingParam);
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [calendarDate, setCalendarDate] = useState<string>('2026-10-30');

  // Active disruptions count
  const activeDisruptions = roomDisruptions.filter((d) => d.status !== 'resolved');

  // Key stats
  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const todayBookings = bookings.filter((b) => b.date === calendarDate && b.status !== 'cancelled');
  const pendingApprovalsCount = bookings.filter((b) => b.status === 'pending').length;

  // Filtered rooms for Catalogue
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedBuilding !== 'all' && r.buildingId !== selectedBuilding) return false;
      if (selectedRoomType !== 'all' && r.roomType !== selectedRoomType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchNumber = r.roomNumber.toLowerCase().includes(q);
        const matchBuilding = r.buildingName.toLowerCase().includes(q);
        const matchEquip = (r.equipment || []).some((e) => e.toLowerCase().includes(q));
        if (!matchName && !matchNumber && !matchBuilding && !matchEquip) return false;
      }
      return true;
    });
  }, [rooms, selectedBuilding, selectedRoomType, searchQuery]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) return false;
      if (selectedBuilding !== 'all' && b.buildingId !== selectedBuilding) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPurpose = b.purpose.toLowerCase().includes(q);
        const matchNumber = b.bookingNumber.toLowerCase().includes(q);
        const matchRoom = b.roomName.toLowerCase().includes(q);
        const matchBooker = b.bookedBy.toLowerCase().includes(q);
        if (!matchPurpose && !matchNumber && !matchRoom && !matchBooker) return false;
      }
      return true;
    });
  }, [bookings, bookingStatusFilter, selectedBuilding, searchQuery]);

  // Helper to trigger reallocation modal
  const handleInitiateReallocation = (booking: RoomBooking) => {
    setSelectedBookingForReallocation(booking);
    setIsReallocateModalOpen(true);
  };

  return (
    <div className="px-6 py-7 space-y-7 min-h-full pb-14">
      {/* ── Top Breadcrumbs & Page Actions ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-xs mb-1.5 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">
              Room Booking & Emergency Management
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-[#E6E9FF] text-[#6878CA] font-jakarta text-[11px] font-bold border border-[#CAD2FC]">
              Phase 2.5
            </span>
          </div>
          <p className="font-jakarta text-xs text-[#74788C] mt-1">
            Real-time space reservation, timetable conflict protection, emergency closures, and alternative room recommendation
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsReportDisruptionOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#BA3D6E]/40 text-[#BA3D6E] font-jakarta font-semibold text-xs hover:bg-[#FDF0F6] shadow-pastel-sm transition-all"
          >
            <ShieldAlert size={15} />
            Report Disruption / Outage
          </button>
          <button
            onClick={() => setIsCreateBookingOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-xs hover:bg-[#383E58] shadow-pastel-sm transition-all"
          >
            <Plus size={15} />
            Reserve a Room
          </button>
        </div>
      </div>

      {/* ── Metric Snapshot Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm">
          <div className="flex items-center justify-between text-[#74788C] mb-1">
            <span className="font-jakarta text-[11px] font-semibold uppercase tracking-wider">Campus Rooms</span>
            <Building2 size={15} className="text-[#6878CA]" />
          </div>
          <p className="font-space font-bold text-2xl text-[#24283B]">{totalRooms}</p>
          <p className="font-jakarta text-[11px] text-[#2E8B67] mt-1 font-medium">Across 7 campus blocks</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm">
          <div className="flex items-center justify-between text-[#74788C] mb-1">
            <span className="font-jakarta text-[11px] font-semibold uppercase tracking-wider">Available Now</span>
            <CheckCircle2 size={15} className="text-[#2E8B67]" />
          </div>
          <p className="font-space font-bold text-2xl text-[#2E8B67]">{availableRooms}</p>
          <p className="font-jakarta text-[11px] text-[#74788C] mt-1">Ready for occupancy</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm">
          <div className="flex items-center justify-between text-[#74788C] mb-1">
            <span className="font-jakarta text-[11px] font-semibold uppercase tracking-wider">Active Disruptions</span>
            <AlertCircle size={15} className="text-[#BA3D6E]" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-space font-bold text-2xl text-[#BA3D6E]">{activeDisruptions.length}</p>
            {activeDisruptions.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#BA3D6E] animate-pulse" />
            )}
          </div>
          <p className="font-jakarta text-[11px] text-[#BA3D6E] mt-1 font-semibold">Immediate reallocation</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm">
          <div className="flex items-center justify-between text-[#74788C] mb-1">
            <span className="font-jakarta text-[11px] font-semibold uppercase tracking-wider">Today&apos;s Bookings</span>
            <Calendar size={15} className="text-[#6878CA]" />
          </div>
          <p className="font-space font-bold text-2xl text-[#24283B]">{todayBookings.length}</p>
          <p className="font-jakarta text-[11px] text-[#74788C] mt-1">{calendarDate}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm">
          <div className="flex items-center justify-between text-[#74788C] mb-1">
            <span className="font-jakarta text-[11px] font-semibold uppercase tracking-wider">Requisitions</span>
            <Clock size={15} className="text-[#C06B33]" />
          </div>
          <p className="font-space font-bold text-2xl text-[#C06B33]">{pendingApprovalsCount}</p>
          <p className="font-jakarta text-[11px] text-[#74788C] mt-1">Awaiting sign-off</p>
        </div>
      </div>

      {/* ── Active Room Disruptions & Emergency Reallocation Banner ────────── */}
      {activeDisruptions.length > 0 && (
        <div className="p-5 rounded-3xl bg-white border-l-4 border-l-[#BA3D6E] border-t border-r border-b border-[#E7E2DD] shadow-pastel-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F6F0E5] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F8DCE8] text-[#BA3D6E] flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h2 className="font-space font-bold text-base text-[#24283B] flex items-center gap-2">
                  Active Emergency Room Disruptions
                  <span className="px-2 py-0.5 rounded-full bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-[10px] font-bold">
                    {activeDisruptions.length} Action Needed
                  </span>
                </h2>
                <p className="font-jakarta text-xs text-[#74788C]">
                  Reported outages automatically prevent double-booking and trigger intelligent alternative room suggestions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-jakarta text-[#74788C]">
              <ShieldCheck size={14} className="text-[#2E8B67]" />
              <span>Conflict Safeguard Active</span>
            </div>
          </div>

          <div className="space-y-3">
            {activeDisruptions.map((rd) => {
              // Find any booking affected by this disruption
              const affectedList = bookings.filter(
                (b) =>
                  rd.affectedBookingIds?.includes(b.id) ||
                  (rd.roomId && b.roomId === rd.roomId && b.status !== 'cancelled' && b.status !== 'rejected')
              );

              return (
                <div
                  key={rd.id}
                  className="p-4 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-space font-bold text-sm text-[#24283B]">{rd.roomCode}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FDF0F6] text-[#BA3D6E] font-jakarta text-[10px] font-bold border border-[#F1B9D2]">
                        {rd.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-[#74788C] font-jakarta text-[10px] font-semibold border border-[#E7E2DD]">
                        {rd.status.toUpperCase()}
                      </span>
                      <span className="text-xs font-jakarta text-[#74788C]">
                        <MapPin size={11} className="inline mr-1" />
                        {rd.buildingName}
                      </span>
                    </div>

                    <p className="font-jakarta text-xs text-[#24283B]">{rd.issue}</p>

                    <div className="flex items-center gap-4 text-xs font-jakarta text-[#74788C] flex-wrap">
                      <span><Clock size={11} className="inline mr-1 text-[#C06B33]" />Downtime ETA: {rd.resolutionEta}</span>
                      {rd.reportedBy && <span>Reported by: {rd.reportedBy}</span>}
                      {rd.relatedIncidentTicket && <span>Incident: {rd.relatedIncidentTicket}</span>}
                    </div>

                    {/* Affected sessions alert */}
                    {affectedList.length > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl bg-white border border-[#C06B33]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs font-jakarta">
                          <span className="font-semibold text-[#C06B33]">Affected Session:</span>{' '}
                          <span className="font-medium text-[#24283B]">{affectedList[0].purpose}</span>{' '}
                          <span className="text-[#74788C]">
                            ({affectedList[0].startTime} - {affectedList[0].endTime}, {affectedList[0].expectedAttendance} pax)
                          </span>
                        </div>

                        {affectedList[0].status !== 'reallocated' && (
                          <button
                            onClick={() => handleInitiateReallocation(affectedList[0])}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#24283B] text-white font-jakarta text-xs font-bold hover:bg-[#383E58] transition-all shadow-pastel-sm flex-shrink-0"
                          >
                            <Sparkles size={12} className="text-[#E9DDFB]" />
                            Reallocate Booking
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col items-end justify-between gap-2 flex-shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-[#E7E2DD]">
                    {rd.alternativeRoom && (
                      <div className="text-right">
                        <span className="text-[10px] font-jakarta text-[#74788C] block uppercase tracking-wider">Suggested Alternative</span>
                        <span className="text-xs font-jakarta font-bold text-[#2E8B67]">{rd.alternativeRoom}</span>
                      </div>
                    )}
                    <button
                      onClick={() => resolveRoomDisruption(rd.id)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#2E8B67] text-[#2E8B67] font-jakarta text-xs font-semibold hover:bg-[#E9F9F2] transition-colors"
                    >
                      Resolve & Re-open
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main View Navigation Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#E7E2DD] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-jakarta text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'schedule'
              ? 'bg-[#24283B] text-white shadow-pastel-sm'
              : 'text-[#74788C] hover:text-[#24283B] hover:bg-white'
          }`}
        >
          <CalendarDays size={14} />
          Timetable & Daily Schedule
        </button>

        <button
          onClick={() => setActiveTab('catalogue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-jakarta text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'catalogue'
              ? 'bg-[#24283B] text-white shadow-pastel-sm'
              : 'text-[#74788C] hover:text-[#24283B] hover:bg-white'
          }`}
        >
          <Layers size={14} />
          Campus Room Catalogue ({rooms.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-jakarta text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'bookings'
              ? 'bg-[#24283B] text-white shadow-pastel-sm'
              : 'text-[#74788C] hover:text-[#24283B] hover:bg-white'
          }`}
        >
          <Clock size={14} />
          All Bookings & Requisitions ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('disruptions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-jakarta text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'disruptions'
              ? 'bg-[#24283B] text-white shadow-pastel-sm'
              : 'text-[#74788C] hover:text-[#24283B] hover:bg-white'
          }`}
        >
          <ShieldAlert size={14} />
          Emergency & Disruption Log ({roomDisruptions.length})
        </button>
      </div>

      {/* ── TAB 1: SCHEDULE & TIMETABLE MATRIX ────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD]">
                <button
                  onClick={() => setCalendarDate('2026-10-29')}
                  className="p-1.5 rounded-lg text-[#74788C] hover:bg-white transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <input
                  type="date"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-space font-bold text-[#24283B] focus:outline-none px-2"
                />
                <button
                  onClick={() => setCalendarDate('2026-10-31')}
                  className="p-1.5 rounded-lg text-[#74788C] hover:bg-white transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Building filter */}
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] font-jakarta text-xs text-[#24283B] focus:outline-none"
              >
                <option value="all">All Campus Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Conflict Protection Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E9F9F2] border border-[#2E8B67]/30 text-xs font-jakarta text-[#2E8B67]">
              <ShieldCheck size={14} />
              <span>Real-Time Double-Booking Prevention Active</span>
            </div>
          </div>

          {/* Schedule Grid Matrix */}
          <div className="bg-white rounded-3xl border border-[#E7E2DD] shadow-pastel-sm overflow-hidden">
            <div className="p-4 border-b border-[#E7E2DD] bg-[#FAF7F1] flex items-center justify-between">
              <span className="font-space font-bold text-xs text-[#24283B] uppercase tracking-wider">
                Room Timetable · {calendarDate}
              </span>
              <div className="flex items-center gap-3 text-[11px] font-jakarta text-[#74788C]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2E8B67]" /> Approved
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C06B33]" /> Pending
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6878CA]" /> Reallocated
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#BA3D6E]" /> Disrupted
                </span>
              </div>
            </div>

            <div className="divide-y divide-[#F6F0E5]">
              {rooms
                .filter((r) => selectedBuilding === 'all' || r.buildingId === selectedBuilding)
                .map((room) => {
                  const roomBookings = bookings.filter(
                    (b) => b.roomId === room.id && b.date === calendarDate && b.status !== 'cancelled'
                  );
                  const isDisrupted = room.status === 'disrupted';

                  return (
                    <div
                      key={room.id}
                      className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isDisrupted ? 'bg-[#FDF0F6]/40' : 'hover:bg-[#FAF7F1]'
                      }`}
                    >
                      {/* Room Details */}
                      <div className="w-full md:w-64 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-space font-bold text-sm text-[#24283B]">{room.roomNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold ${
                              isDisrupted
                                ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                                : 'bg-[#E9F9F2] text-[#2E8B67]'
                            }`}
                          >
                            {isDisrupted ? 'DISRUPTED' : `${room.capacity} seats`}
                          </span>
                        </div>
                        <p className="font-jakarta text-xs text-[#24283B] font-medium">{room.name}</p>
                        <p className="font-jakarta text-[11px] text-[#74788C]">
                          {room.buildingName} · {room.floor}
                        </p>
                      </div>

                      {/* Timeline Slots Visualizer */}
                      <div className="flex-1 space-y-2">
                        {isDisrupted ? (
                          <div className="p-2.5 rounded-xl bg-[#F8DCE8] border border-[#BA3D6E]/30 text-xs font-jakarta text-[#8A2252] flex items-center justify-between">
                            <span>Closed due to active operational disruption</span>
                            <button
                              onClick={() => {
                                const affected = bookings.find((b) => b.roomId === room.id);
                                if (affected) handleInitiateReallocation(affected);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#24283B] text-white font-jakarta text-[11px] font-bold hover:bg-[#383E58]"
                            >
                              Reallocate
                            </button>
                          </div>
                        ) : roomBookings.length === 0 ? (
                          <div className="p-2.5 rounded-xl bg-[#FAF7F1] border border-dashed border-[#E7E2DD] text-xs font-jakarta text-[#74788C] flex items-center justify-between">
                            <span>No bookings scheduled for this date (Available)</span>
                            <button
                              onClick={() => setIsCreateBookingOpen(true)}
                              className="text-[#6878CA] hover:underline font-semibold text-[11px]"
                            >
                              + Reserve
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {roomBookings.map((b) => {
                              const badge = STATUS_BADGES[b.status];
                              return (
                                <div
                                  key={b.id}
                                  className="p-2.5 rounded-xl border border-[#E7E2DD] bg-white shadow-pastel-xs flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span
                                        className="px-1.5 py-0.2 rounded-full font-jakarta text-[9px] font-bold"
                                        style={{ background: badge.bg, color: badge.text }}
                                      >
                                        {badge.label}
                                      </span>
                                      <span className="font-space font-bold text-xs text-[#24283B]">
                                        {b.startTime} - {b.endTime}
                                      </span>
                                    </div>
                                    <p className="font-jakarta text-xs text-[#24283B] font-medium truncate max-w-[200px]">
                                      {b.purpose}
                                    </p>
                                    <p className="font-jakarta text-[10px] text-[#74788C]">
                                      {b.bookedBy} · {b.expectedAttendance} pax
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {b.status === 'pending' && user.role !== 'Student Affairs Liaison' && (
                                      <button
                                        onClick={() => approveBooking(b.id)}
                                        className="p-1 rounded-lg bg-[#E9F9F2] text-[#2E8B67] hover:bg-[#D5F3E8]"
                                        title="Approve Booking"
                                      >
                                        <Check size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ROOM CATALOGUE ────────────────────────────────────────── */}
      {activeTab === 'catalogue' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
              <input
                type="text"
                placeholder="Search rooms by name, code, floor, equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-[#FAF7F1] focus:outline-none focus:border-[#6878CA]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] font-jakarta text-xs text-[#24283B] focus:outline-none"
              >
                <option value="all">All Buildings</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] font-jakarta text-xs text-[#24283B] focus:outline-none"
              >
                <option value="all">All Room Types</option>
                <option value="lecture_hall">Lecture Halls</option>
                <option value="laboratory">Laboratories</option>
                <option value="seminar_hall">Seminar Halls</option>
                <option value="auditorium">Auditoriums</option>
                <option value="conference_room">Conference Rooms</option>
                <option value="workshop">Workshops</option>
              </select>
            </div>
          </div>

          {/* Room Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const isDisrupted = room.status === 'disrupted';
              return (
                <div
                  key={room.id}
                  className={`p-5 rounded-3xl bg-white border transition-all flex flex-col justify-between ${
                    isDisrupted
                      ? 'border-[#BA3D6E]/40 shadow-pastel-xs'
                      : 'border-[#E7E2DD] hover:shadow-pastel-md'
                  }`}
                >
                  <div>
                    {/* Header: Room Number & Status */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="font-space font-bold text-lg text-[#24283B]">{room.roomNumber}</span>
                        <h3 className="font-space font-bold text-sm text-[#24283B]">{room.name}</h3>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold ${
                          isDisrupted
                            ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                            : 'bg-[#E9F9F2] text-[#2E8B67]'
                        }`}
                      >
                        {isDisrupted ? 'DISRUPTED' : 'AVAILABLE'}
                      </span>
                    </div>

                    {/* Location & Capacity */}
                    <p className="font-jakarta text-xs text-[#74788C] mb-3">
                      <MapPin size={12} className="inline mr-1 text-[#6878CA]" />
                      {room.buildingName} · {room.floor}
                    </p>

                    <div className="p-3 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] grid grid-cols-2 gap-2 mb-3 text-xs font-jakarta">
                      <div>
                        <span className="text-[#74788C] text-[10px] block">Capacity</span>
                        <span className="font-space font-bold text-[#24283B]">{room.capacity} seats</span>
                      </div>
                      <div>
                        <span className="text-[#74788C] text-[10px] block">Category</span>
                        <span className="font-semibold text-[#6878CA]">
                          {ROOM_TYPE_LABELS[room.roomType]}
                        </span>
                      </div>
                    </div>

                    {/* Equipment Chips */}
                    <div className="space-y-1 mb-4">
                      <span className="text-[10px] font-jakarta font-bold text-[#74788C] uppercase tracking-wider block">
                        Equipment & Tech
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {room.equipment.slice(0, 4).map((eq) => (
                          <span
                            key={eq}
                            className="px-2 py-0.5 rounded-lg bg-white border border-[#E7E2DD] text-[10px] font-jakarta text-[#24283B]"
                          >
                            {eq}
                          </span>
                        ))}
                        {room.equipment.length > 4 && (
                          <span className="text-[10px] font-jakarta text-[#74788C]">
                            +{room.equipment.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3 border-t border-[#F6F0E5]">
                    {isDisrupted ? (
                      <button
                        onClick={() => {
                          const affected = bookings.find((b) => b.roomId === room.id);
                          if (affected) handleInitiateReallocation(affected);
                          else setIsReportDisruptionOpen(true);
                        }}
                        className="w-full py-2 rounded-xl bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-xs font-bold hover:bg-[#F1B9D2] transition-colors"
                      >
                        Resolve Disruption / Reallocate
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsCreateBookingOpen(true)}
                        className="w-full py-2 rounded-xl bg-[#24283B] text-white font-jakarta text-xs font-bold hover:bg-[#383E58] transition-colors shadow-pastel-xs"
                      >
                        Reserve This Room
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: ALL BOOKINGS & REQUISITIONS ────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
              <input
                type="text"
                placeholder="Search bookings by session, ID, requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-[#FAF7F1] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] font-jakarta text-xs text-[#24283B] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending Approval</option>
                <option value="reallocated">Reallocated</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-3">
            {filteredBookings.map((b) => {
              const badge = STATUS_BADGES[b.status];
              const isRoomDisrupted = rooms.find((r) => r.id === b.roomId)?.status === 'disrupted';

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-3xl bg-white border border-[#E7E2DD] shadow-pastel-sm hover:shadow-pastel-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-space font-bold text-xs text-[#74788C]">{b.bookingNumber}</span>
                      <span
                        className="px-2.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                      {b.status === 'reallocated' && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E6E9FF] text-[#6878CA] font-jakarta text-[10px] font-bold">
                          Relocated from {b.reallocatedFromRoomName}
                        </span>
                      )}
                      {isRoomDisrupted && b.status !== 'reallocated' && (
                        <span className="px-2 py-0.5 rounded-full bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-[10px] font-bold animate-pulse">
                          Active Disruption Impact
                        </span>
                      )}
                    </div>

                    <h3 className="font-space font-bold text-base text-[#24283B]">{b.purpose}</h3>

                    <div className="flex items-center gap-4 text-xs font-jakarta text-[#74788C] flex-wrap">
                      <span><MapPin size={12} className="inline mr-1 text-[#6878CA]" />{b.roomName} ({b.buildingName})</span>
                      <span><Calendar size={12} className="inline mr-1 text-[#2E8B67]" />{b.date} ({b.startTime} - {b.endTime})</span>
                      <span><Users size={12} className="inline mr-1 text-[#C06B33]" />{b.expectedAttendance} attendees</span>
                      <span>Booked by: {b.bookedBy} ({b.department})</span>
                    </div>

                    {b.reallocationReason && (
                      <p className="font-jakarta text-[11px] text-[#6878CA] italic mt-1">
                        Reason: {b.reallocationReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* If disrupted, allow reallocate */}
                    {isRoomDisrupted && b.status !== 'reallocated' && (
                      <button
                        onClick={() => handleInitiateReallocation(b)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#24283B] text-white font-jakarta text-xs font-bold hover:bg-[#383E58] shadow-pastel-sm transition-all"
                      >
                        <Sparkles size={13} className="text-[#E9DDFB]" />
                        Reallocate Room
                      </button>
                    )}

                    {/* If pending approval */}
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveBooking(b.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#E9F9F2] text-[#2E8B67] border border-[#2E8B67] font-jakarta text-xs font-bold hover:bg-[#D5F3E8] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectBooking(b.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#F8DCE8] text-[#BA3D6E] border border-[#BA3D6E] font-jakarta text-xs font-bold hover:bg-[#F1B9D2] transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {b.status !== 'cancelled' && b.status !== 'rejected' && (
                      <button
                        onClick={() => cancelBooking(b.id)}
                        className="px-3 py-2 rounded-xl border border-[#E7E2DD] text-[#74788C] font-jakarta text-xs font-semibold hover:bg-[#FAF7F1] transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: EMERGENCY & DISRUPTION AUDIT LOG ──────────────────────── */}
      {activeTab === 'disruptions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-pastel-sm">
            <h3 className="font-space font-bold text-sm text-[#24283B]">Emergency & Disruption Incident Ledger</h3>
            <p className="font-jakarta text-xs text-[#74788C] mt-0.5">
              Comprehensive operational log of all reported campus outages, downtime ETAs, and authorized room reassignments
            </p>
          </div>

          <div className="space-y-3">
            {roomDisruptions.map((disruption) => (
              <div
                key={disruption.id}
                className="p-5 rounded-3xl bg-white border border-[#E7E2DD] shadow-pastel-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-space font-bold text-sm text-[#24283B]">
                        {disruption.disruptionNumber || disruption.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold ${
                          disruption.status === 'resolved'
                            ? 'bg-[#E9F9F2] text-[#2E8B67]'
                            : 'bg-[#F8DCE8] text-[#BA3D6E]'
                        }`}
                      >
                        {disruption.status.toUpperCase()}
                      </span>
                      <span className="text-xs font-jakarta text-[#74788C]">
                        {disruption.createdAt || 'Today'}
                      </span>
                    </div>
                    <p className="font-jakarta text-sm text-[#24283B] font-semibold">{disruption.issue}</p>
                    <p className="font-jakarta text-xs text-[#74788C]">
                      Venue: {disruption.roomCode} · {disruption.buildingName}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-jakarta text-xs font-semibold text-[#C06B33]">
                      ETA: {disruption.resolutionEta}
                    </span>
                  </div>
                </div>

                {disruption.alternativeRoom && (
                  <div className="p-3 rounded-2xl bg-[#F2F4FF] border border-[#CAD2FC] text-xs font-jakarta text-[#6878CA] flex items-center justify-between">
                    <span>
                      Reallocated Session Alternative: <strong>{disruption.alternativeRoom}</strong>
                    </span>
                    <span className="font-semibold text-[#2E8B67]">Status: Mitigated</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
