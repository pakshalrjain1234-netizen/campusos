import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, Clock, AlertCircle } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

export default function BookingsPage() {
  const { roomDisruptions } = useCampus();

  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Room Booking</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Reserve and manage campus spaces, lecture halls, and laboratories</p>
      </div>

      {/* Active disruptions */}
      {roomDisruptions.length > 0 && (
        <div>
          <h2 className="font-space font-bold text-base text-[#24283B] mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-[#BA3D6E]" /> Active Room Disruptions
          </h2>
          <div className="space-y-3">
            {roomDisruptions.map((rd) => (
              <div key={rd.id} className="p-5 bg-white rounded-card border-l-4 border-l-[#BA3D6E] border-t border-r border-b border-[#E7E2DD]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-space font-bold text-[14px] text-[#24283B]">{rd.roomCode}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-[10px] font-bold">Active Disruption</span>
                    </div>
                    <p className="font-jakarta text-[12px] text-[#74788C] mb-1"><MapPin size={11} className="inline mr-1" />{rd.buildingName}</p>
                    <p className="font-jakarta text-[13px] text-[#24283B]">{rd.issue}</p>
                    <p className="font-jakarta text-[12px] text-[#74788C] mt-1">Affected: {rd.affectedSchedule}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-jakarta text-[11px] text-[#74788C]"><Clock size={11} className="inline mr-1" />ETA: {rd.resolutionEta}</p>
                    {rd.alternativeRoom && (
                      <p className="font-jakarta text-[11px] text-[#2E8B67] mt-1 font-semibold">Alt: {rd.alternativeRoom}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Live Room Availability', desc: 'See which rooms are free right now, occupied, under maintenance, or blocked for special events across all campus buildings.', icon: CalendarDays, bg: '#F2F4FF', color: '#6878CA' },
          { title: 'Instant Booking', desc: 'Reserve any room with one click, set recurrence, invite attendees, and get instant confirmation with QR code access.', icon: MapPin, bg: '#E9F9F2', color: '#2E8B67' },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="p-6 rounded-card border border-[#E7E2DD] flex gap-4" style={{ background: f.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.color + '20' }}>
                <Icon size={20} style={{ color: f.color }} />
              </div>
              <div>
                <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">{f.title}</h3>
                <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">{f.desc}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/80 text-[#74788C] font-jakarta text-[10px] font-semibold">Coming in Phase 2</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-card bg-[#F2F4FF] border border-[#E6E9FF]">
        <p className="font-jakarta text-[12px] text-[#6878CA]">
          <strong>Phase 1 · Demo Mode:</strong> Calendar-based scheduling, conflict detection, and academic timetable integration are planned for Phase 2.
        </p>
      </div>
    </div>
  );
}

