import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  DoorOpen,
  Plus,
  Clock,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';

export default function StudentFacultyDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    incidents,
    bookings,
    classrooms,
    notifications,
    setIsReportIncidentOpen,
  } = useCampus();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Filter incidents reported by this user (or liaison demo role)
  const myIncidents = incidents.filter(
    (i) =>
      i.reporterId === user?.id ||
      i.reportedBy?.toLowerCase().includes((user?.fullName || '').toLowerCase()) ||
      i.reportedRole === 'student' ||
      i.reportedRole === 'faculty' ||
      i.reportedRole === 'liaison'
  );

  const openComplaints = myIncidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
  const resolvedComplaints = myIncidents.filter((i) => i.status === 'resolved' || i.status === 'closed');

  // Filter bookings for this user
  const myBookings = bookings.filter(
    (b) =>
      b.bookedBy?.toLowerCase().includes((user?.fullName || '').toLowerCase()) ||
      b.department?.toLowerCase() === (user?.departmentName || '').toLowerCase()
  );

  const availableRoomsCount = classrooms.filter((c) => c.status === 'available').length;

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div
        className="relative flex flex-col md:flex-row items-start md:items-end justify-between p-6 sm:p-8 rounded-card-lg overflow-hidden border border-[#E7E2DD]"
        style={{ background: 'linear-gradient(135deg, #F0FBF7 0%, #E6E9FF 60%, #FAF7F1 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#D5F3E8] text-[#2E8B67] font-jakarta text-[11px] font-bold">
              Student & Faculty Portal
            </span>
            <span className="text-xs font-jakarta text-[#74788C]">
              {user?.departmentName || 'Computer Science & Engineering'}
            </span>
          </div>
          <h1 className="font-space font-bold text-3xl sm:text-4xl text-[#24283B] tracking-tight">
            Welcome, {user?.fullName || 'Campus Member'}.
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-2 max-w-lg leading-relaxed">
            Report facility disruptions, track your maintenance complaints, check live classroom occupancy, and reserve campus study spaces.
          </p>
        </div>

        <div className="relative z-10 mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
          <p className="font-space font-bold text-xs text-[#24283B]">{today}</p>
          <button
            onClick={() => setIsReportIncidentOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24283B] text-white hover:bg-[#383E58] font-jakarta text-xs font-semibold shadow-pastel-sm transition-all"
          >
            <Plus size={15} /> Report New Issue
          </button>
        </div>
      </div>

      {/* ── Emergency Announcement Banner ── */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
          <ShieldAlert size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-space font-bold text-xs uppercase tracking-wider text-amber-900">
              Campus Facilities Advisory
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-800">
              Active Today
            </span>
          </div>
          <p className="font-jakarta text-xs text-amber-900 mt-0.5 leading-relaxed">
            Chiller maintenance in IT Block Room 401 is ongoing. All practical classes in IT Block Level 2 have been rescheduled to Academic Block Smart Rooms. Emergency helpline: <strong>Ext. 4004</strong>.
          </p>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8DCE8] flex items-center justify-center text-[#BA3D6E]">
              <AlertTriangle size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#BA3D6E] bg-white px-2 py-0.5 rounded-full border border-[#F8DCE8]">
              Active
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{openComplaints.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            My Open Complaints
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#E9F9F2]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D5F3E8] flex items-center justify-center text-[#2E8B67]">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-white px-2 py-0.5 rounded-full border border-[#D5F3E8]">
              Completed
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{resolvedComplaints.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Resolved Issues
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#F2F4FF]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6E9FF] flex items-center justify-center text-[#6878CA]">
              <CalendarDays size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#6878CA] bg-white px-2 py-0.5 rounded-full border border-[#E6E9FF]">
              Bookings
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{myBookings.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Room Reservations
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FAF7F1]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E2DD] flex items-center justify-center text-[#74788C]">
              <DoorOpen size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-[#D5F3E8] px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{availableRoomsCount}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Rooms Vacant Now
          </p>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Complaints Tracking (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#BA3D6E]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                My Submitted Complaints & Requests
              </h2>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline flex items-center gap-1"
            >
              View Full History <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] overflow-hidden shadow-xs divide-y divide-[#F6F0E5]">
            {myIncidents.length > 0 ? (
              myIncidents.slice(0, 5).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate('/incidents')}
                  className="p-4 hover:bg-[#FAF7F1] transition-colors cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-space font-bold text-xs text-[#24283B]">
                        {inc.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          inc.severity === 'critical'
                            ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                            : inc.severity === 'high'
                            ? 'bg-[#FFE4CF] text-[#C06B33]'
                            : 'bg-[#E6E9FF] text-[#4A5AA0]'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-semibold uppercase">
                        {inc.lifecycleStatus || inc.status}
                      </span>
                      {inc.mappedLocationLevel === 'asset' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E9F9F2] text-[#2E8B67]">
                          ✓ Photo Pinpoint
                        </span>
                      )}
                    </div>
                    <p className="font-jakarta font-semibold text-xs text-[#24283B] truncate">
                      {inc.title}
                    </p>
                    <p className="font-jakarta text-[11px] text-[#74788C] flex items-center gap-1">
                      <MapPin size={11} /> {inc.buildingName} · {inc.room || 'General Area'}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 text-[11px] font-jakarta text-[#74788C]">
                    <span className="flex items-center gap-1 justify-end">
                      <Clock size={11} /> {inc.createdAt}
                    </span>
                    <span className="text-[10px] text-[#4A5AA0] font-semibold block mt-1">
                      Click to track →
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-jakarta text-[#74788C]">
                You have not reported any maintenance disruptions yet.
              </div>
            )}
          </div>

          {/* Quick Action Banner */}
          <div className="p-4 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E7E2DD] flex items-center justify-center text-[#24283B]">
                <Plus size={16} />
              </div>
              <div>
                <p className="font-space font-bold text-xs text-[#24283B]">Notice broken furniture or faulty AC?</p>
                <p className="font-jakarta text-[11px] text-[#74788C]">
                  Take a photo and report with exact classroom and asset pin mapping.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsReportIncidentOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#24283B] text-white hover:bg-[#383E58] font-jakarta text-xs font-semibold whitespace-nowrap shadow-xs"
            >
              Report Incident
            </button>
          </div>
        </div>

        {/* Right Column: Room Bookings & 3D Twin Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#7C5CBF]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                My Room Reservations
              </h2>
            </div>
            <button
              onClick={() => navigate('/bookings')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline"
            >
              Book Room
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] p-4 space-y-3">
            {myBookings.length > 0 ? (
              myBookings.map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-space font-bold text-xs text-[#24283B]">{b.roomName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E9F9F2] text-[#2E8B67] uppercase">
                      {b.status}
                    </span>
                  </div>
                  <p className="font-jakarta text-xs text-[#24283B] truncate">{b.title}</p>
                  <p className="font-jakarta text-[10px] text-[#74788C] flex items-center gap-2">
                    <span>{b.date}</span> · <span>{b.timeSlot}</span>
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs font-jakarta text-[#74788C]">
                No active room bookings. Need a study or seminar room?
                <button
                  onClick={() => navigate('/bookings')}
                  className="block mx-auto mt-2 text-xs font-bold text-[#4A5AA0] hover:underline"
                >
                  Explore Available Rooms →
                </button>
              </div>
            )}
          </div>

          {/* 3D Digital Twin Quick Card */}
          <div className="p-4 rounded-card border border-[#E7E2DD] bg-[#F2F4FF] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-space font-bold text-xs text-[#24283B]">3D Digital Twin</span>
              <button
                onClick={() => navigate('/campus-3d')}
                className="text-[11px] font-bold text-[#6878CA] flex items-center gap-1 hover:underline"
              >
                Launch Model <ExternalLink size={11} />
              </button>
            </div>
            <p className="font-jakarta text-xs text-[#74788C]">
              Inspect campus facilities, floor maps, and verify room layouts before arriving for your lecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

