import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, DoorOpen, Search, Filter, CheckCircle2, Clock, 
  Building2, Users, Sparkles, Layers, Wrench, ShieldCheck, 
  HelpCircle, Calendar, Cpu, Check, AlertTriangle, ArrowRight,
  Eye, RefreshCw, Radio
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { useAuth } from '../context/AuthContext';
import { ClassroomOccupancy, OccupancyStatus, OccupancyDataSource } from '../types';
import CampusViewer3D from '../components/3d/CampusViewer3D';
import ThreejsErrorBoundary from '../components/3d/ThreejsErrorBoundary';

const STATUS_CONFIG: Record<
  OccupancyStatus,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  occupied: {
    label: 'OCCUPIED',
    bg: '#FFE4CF',
    text: '#C06B33',
    border: '#FFC89E',
    desc: 'Presence verified by faculty check-in',
  },
  scheduled: {
    label: 'SCHEDULED',
    bg: '#E6E9FF',
    text: '#4A5AA0',
    border: '#C5CDFF',
    desc: 'Timetable class scheduled (presence unconfirmed)',
  },
  available: {
    label: 'AVAILABLE',
    bg: '#D5F3E8',
    text: '#2E8B67',
    border: '#A6E6CD',
    desc: 'Vacant, unreserved & ready for booking',
  },
  unknown: {
    label: 'UNKNOWN',
    bg: '#E9DDFB',
    text: '#5D4586',
    border: '#D8C5F7',
    desc: 'No recent telemetry (do not assume vacant)',
  },
  under_maintenance: {
    label: 'MAINTENANCE',
    bg: '#F8DCE8',
    text: '#BA3D6E',
    border: '#F2B5CD',
    desc: 'Work order or technical disruption active',
  },
};

const SOURCE_LABELS: Record<OccupancyDataSource, string> = {
  faculty_checkin: 'Faculty Check-In',
  timetable: 'Timetable Sync',
  booking: 'Approved Booking',
  sensor_iot: 'ESP32 mmWave Telemetry',
  manual_inspection: 'Physical Inspection',
};

export default function OccupancyPage() {
  const { 
    classrooms, 
    performFacultyCheckIn, 
    updateClassroomOccupancyStatus,
    buildings,
    selectedBuildingId,
    setSelectedBuildingId,
    showToast
  } = useCampus();

  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<'grid' | 'finder' | '3d'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('All');
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Smart Finder State
  const [finderCapacity, setFinderCapacity] = useState(30);
  const [finderEquipment, setFinderEquipment] = useState<string[]>([]);
  const [finderBuilding, setFinderBuilding] = useState('All');

  // Multi-attribute filtered classrooms
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.roomCode.toLowerCase().includes(q) ||
          c.roomName.toLowerCase().includes(q) ||
          c.buildingName.toLowerCase().includes(q) ||
          (c.currentClass && c.currentClass.courseName.toLowerCase().includes(q)) ||
          (c.currentClass && c.currentClass.facultyName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (selectedBuildingFilter !== 'All') {
        if (c.buildingCode !== selectedBuildingFilter && c.buildingId !== selectedBuildingFilter) {
          return false;
        }
      }

      if (selectedFloorFilter !== 'All') {
        if (c.floor.toString() !== selectedFloorFilter) {
          return false;
        }
      }

      if (selectedStatusFilter !== 'All') {
        if (c.status !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [classrooms, searchQuery, selectedBuildingFilter, selectedFloorFilter, selectedStatusFilter]);

  // Statistics
  const totalClassrooms = classrooms.length;
  const occupiedCount = classrooms.filter((c) => c.status === 'occupied').length;
  const scheduledCount = classrooms.filter((c) => c.status === 'scheduled').length;
  const availableCount = classrooms.filter((c) => c.status === 'available').length;
  const unknownCount = classrooms.filter((c) => c.status === 'unknown').length;
  const maintenanceCount = classrooms.filter((c) => c.status === 'under_maintenance').length;

  // Smart Finder candidates
  const finderCandidates = useMemo(() => {
    return classrooms.filter((c) => {
      // Must be strictly AVAILABLE
      if (c.status !== 'available') return false;
      if (c.capacity < finderCapacity) return false;
      if (finderBuilding !== 'All' && c.buildingCode !== finderBuilding) return false;

      // Check equipment
      if (finderEquipment.length > 0) {
        const hasAllEquip = finderEquipment.every((req) =>
          c.equipment.some((eq) => eq.toLowerCase().includes(req.toLowerCase()))
        );
        if (!hasAllEquip) return false;
      }

      return true;
    }).sort((a, b) => a.capacity - b.capacity);
  }, [classrooms, finderCapacity, finderBuilding, finderEquipment]);

  const toggleEquipmentFilter = (eq: string) => {
    setFinderEquipment((prev) =>
      prev.includes(eq) ? prev.filter((item) => item !== eq) : [...prev, eq]
    );
  };

  return (
    <div className="px-6 py-7 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm transition-colors"
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">
            Intelligent Classroom Occupancy
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-1">
            Verified presence tracking, timetable synchronisation, faculty check-ins & sensor-ready architecture
          </p>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center p-1 bg-white rounded-xl border border-[#E7E2DD] shadow-pastel-sm">
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-jakarta text-xs font-semibold transition-all ${
              activeTab === 'grid'
                ? 'bg-[#24283B] text-white shadow-xs'
                : 'text-[#74788C] hover:text-[#24283B]'
            }`}
          >
            <DoorOpen size={14} /> Live Roster
          </button>
          <button
            onClick={() => setActiveTab('finder')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-jakarta text-xs font-semibold transition-all ${
              activeTab === 'finder'
                ? 'bg-[#24283B] text-white shadow-xs'
                : 'text-[#74788C] hover:text-[#24283B]'
            }`}
          >
            <Sparkles size={14} /> Smart Room Finder
          </button>
          <button
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-jakarta text-xs font-semibold transition-all ${
              activeTab === '3d'
                ? 'bg-[#24283B] text-white shadow-xs'
                : 'text-[#74788C] hover:text-[#24283B]'
            }`}
          >
            <Layers size={14} /> 3D Digital Twin
          </button>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Classrooms', value: totalClassrooms, color: '#24283B', bg: '#F6F0E5', border: '#E7E2DD' },
          { label: 'Occupied (Verified)', value: occupiedCount, color: '#C06B33', bg: '#FFF2E7', border: '#FFE4CF' },
          { label: 'Scheduled Only', value: scheduledCount, color: '#4A5AA0', bg: '#F2F4FF', border: '#E6E9FF' },
          { label: 'Available Now', value: availableCount, color: '#2E8B67', bg: '#E9F9F2', border: '#D5F3E8' },
          { label: 'Unknown State', value: unknownCount, color: '#5D4586', bg: '#E9DDFB', border: '#D8C5F7' },
          { label: 'Under Maintenance', value: maintenanceCount, color: '#BA3D6E', bg: '#FDF0F6', border: '#F8DCE8' },
        ].map((s) => (
          <div
            key={s.label}
            className="p-3.5 rounded-card border transition-all duration-200"
            style={{ background: s.bg, borderColor: s.border }}
          >
            <p className="font-space font-bold text-2xl" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="font-jakarta text-[11px] font-semibold text-[#74788C] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* TAB 1: LIVE ROSTER VIEW */}
      {activeTab === 'grid' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
                <input
                  type="text"
                  placeholder="Search room code (A101), course name, faculty, building..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA]"
                />
              </div>

              {/* Building Filter */}
              <select
                value={selectedBuildingFilter}
                onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              >
                <option value="All">All Facilities (14)</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>

              {/* Floor Filter */}
              <select
                value={selectedFloorFilter}
                onChange={(e) => setSelectedFloorFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              >
                <option value="All">All Floors</option>
                <option value="0">Ground Floor (Floor 0)</option>
                <option value="1">1st Floor (Floor 1)</option>
                <option value="2">2nd Floor (Floor 2)</option>
                <option value="3">3rd Floor (Floor 3)</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="occupied">Occupied (Verified)</option>
                <option value="scheduled">Scheduled (Presence Unconfirmed)</option>
                <option value="available">Available</option>
                <option value="unknown">Unknown</option>
                <option value="under_maintenance">Under Maintenance</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs font-jakarta text-[#74788C] pt-1 border-t border-[#E7E2DD]/50">
              <span>
                Displaying <strong className="text-[#24283B]">{filteredClassrooms.length}</strong> of{' '}
                <strong>{classrooms.length}</strong> classrooms
              </span>
              {(searchQuery || selectedBuildingFilter !== 'All' || selectedFloorFilter !== 'All' || selectedStatusFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBuildingFilter('All');
                    setSelectedFloorFilter('All');
                    setSelectedStatusFilter('All');
                  }}
                  className="text-[#BA3D6E] font-semibold hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClassrooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status];

              return (
                <div
                  key={room.id}
                  className="p-5 bg-white rounded-2xl border border-[#E7E2DD] hover:shadow-pastel-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Header Strip */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-space font-bold text-base text-[#24283B] tracking-tight">
                          {room.roomCode}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold border uppercase"
                          style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <span className="font-jakarta text-[10px] font-semibold text-[#74788C] bg-[#FAF7F1] px-2 py-0.5 rounded-md border border-[#E7E2DD]">
                        Floor {room.floor}
                      </span>
                    </div>

                    <h3 className="font-space font-bold text-sm text-[#24283B]">{room.roomName}</h3>
                    <p className="font-jakarta text-xs text-[#74788C] mt-0.5">
                      {room.buildingName} ({room.buildingCode}) · Capacity: <strong>{room.capacity} seats</strong>
                    </p>

                    {/* Equipment Tags */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {room.equipment.map((eq) => (
                        <span
                          key={eq}
                          className="px-2 py-0.5 rounded-md bg-[#FAF7F1] text-[#74788C] font-jakarta text-[10px] border border-[#E7E2DD]"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>

                    {/* Schedule / Current Class Section */}
                    {room.currentClass && (
                      <div className="mt-3.5 p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#24283B]">
                            {room.currentClass.courseCode}: {room.currentClass.courseName}
                          </span>
                          <span className="text-[10px] text-[#74788C]">
                            {room.currentClass.startTime} – {room.currentClass.endTime}
                          </span>
                        </div>
                        <p className="text-[#74788C] text-[11px]">
                          Faculty: <strong className="text-[#24283B]">{room.currentClass.facultyName}</strong>
                        </p>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#E7E2DD]/50">
                          <span>Expected: {room.currentClass.expectedStudents} students</span>
                          <span className={room.currentClass.isCheckedIn ? 'text-[#2E8B67] font-bold' : 'text-[#C06B33]'}>
                            {room.currentClass.isCheckedIn ? '✓ Faculty Checked In' : '⏳ Awaiting Check-In'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Maintenance Alert if applicable */}
                    {room.maintenanceIssue && (
                      <div className="mt-3 p-2.5 rounded-xl bg-[#FDF0F6] border border-[#F8DCE8] flex items-start gap-2 text-xs font-jakarta text-[#BA3D6E]">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>{room.maintenanceIssue}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Data Source, Sensor, and Faculty Action */}
                  <div className="pt-4 mt-4 border-t border-[#E7E2DD] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-jakarta text-[#74788C]">
                      <span className="flex items-center gap-1">
                        <Radio size={11} className="text-[#6878CA]" />
                        Source: <strong>{SOURCE_LABELS[room.dataSource]}</strong>
                      </span>
                      <span className="capitalize">
                        Confidence: <strong className={room.confidenceLevel === 'high' ? 'text-[#2E8B67]' : 'text-[#C06B33]'}>{room.confidenceLevel}</strong>
                      </span>
                    </div>

                    {/* Sensor Telemetry Pill */}
                    {room.sensorMeta && (
                      <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[#F2F4FF] border border-[#E6E9FF] text-[10px] font-jakarta">
                        <span className="flex items-center gap-1 text-[#4A5AA0]">
                          <Cpu size={11} /> {room.sensorMeta.sensorId} ({room.sensorMeta.sensorType})
                        </span>
                        <span className={room.sensorMeta.connectionStatus === 'online' ? 'text-[#2E8B67] font-bold' : 'text-[#BA3D6E]'}>
                          ● {room.sensorMeta.connectionStatus.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Interactive Faculty Check-In Button */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-jakarta text-[#74788C]">Updated: {room.lastUpdated}</span>

                      {room.status !== 'occupied' && room.status !== 'under_maintenance' ? (
                        <button
                          onClick={() => performFacultyCheckIn(room.roomCode)}
                          className="px-3 py-1.5 rounded-xl bg-[#24283B] text-white font-jakarta text-xs font-semibold hover:bg-[#383E58] transition-colors flex items-center gap-1 shadow-pastel-sm"
                        >
                          <CheckCircle2 size={13} /> Faculty Check-In
                        </button>
                      ) : room.status === 'occupied' ? (
                        <button
                          onClick={() => updateClassroomOccupancyStatus(room.roomCode, 'available')}
                          className="px-3 py-1.5 rounded-xl border border-[#E7E2DD] bg-white text-[#74788C] font-jakarta text-xs font-semibold hover:bg-[#FAF7F1] transition-colors"
                        >
                          Mark Vacated
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SMART CLASSROOM FINDER */}
      {activeTab === 'finder' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Finder Controls */}
          <div className="p-6 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-5">
            <div>
              <h3 className="font-space font-bold text-lg text-[#24283B]">Smart Classroom Finder</h3>
              <p className="font-jakarta text-xs text-[#74788C] mt-0.5">
                Multi-constraint availability engine ensuring verified vacancy without timetable conflicts
              </p>
            </div>

            {/* Capacity Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-jakarta mb-1.5">
                <span className="font-semibold text-[#24283B]">Minimum Capacity Required</span>
                <span className="font-space font-bold text-sm text-[#4A5AA0]">{finderCapacity} seats</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={finderCapacity}
                onChange={(e) => setFinderCapacity(parseInt(e.target.value))}
                className="w-full accent-[#6878CA]"
              />
            </div>

            {/* Building Selection */}
            <div>
              <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-1.5">
                Preferred Facility
              </label>
              <select
                value={finderBuilding}
                onChange={(e) => setFinderBuilding(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              >
                <option value="All">Any Facility on Campus</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Requirements */}
            <div>
              <label className="block font-jakarta text-xs font-semibold text-[#24283B] mb-2">
                Required Technical Equipment
              </label>
              <div className="flex flex-wrap gap-2">
                {['Laser Projector', 'Interactive Display', 'Microphone', 'AC', 'Chemical Fume Hoods', 'Workstations'].map(
                  (eq) => {
                    const isSelected = finderEquipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipmentFilter(eq)}
                        className={`px-3 py-1.5 rounded-xl font-jakarta text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-[#24283B] text-white shadow-xs'
                            : 'bg-[#FAF7F1] border border-[#E7E2DD] text-[#74788C] hover:bg-[#F2F4FF]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {eq}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="p-3 bg-[#E9F9F2] rounded-xl border border-[#A6E6CD] text-xs font-jakarta text-[#2E8B67] space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck size={14} /> Database Rule Validation Active
              </p>
              <p className="text-[11px] leading-relaxed">
                Rooms under maintenance, scheduled for an upcoming lecture, or in an unknown state are strictly excluded from allocation.
              </p>
            </div>
          </div>

          {/* Right Candidate Results */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-space font-bold text-base text-[#24283B]">
                Matching Available Classrooms ({finderCandidates.length})
              </h3>
              <span className="font-jakarta text-xs text-[#74788C]">
                Sorted by optimal capacity fit
              </span>
            </div>

            {finderCandidates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[#E7E2DD] p-8">
                <DoorOpen size={36} className="mx-auto text-[#74788C] mb-3 opacity-60" />
                <h4 className="font-space font-bold text-base text-[#24283B]">No Classrooms Match Constraints</h4>
                <p className="font-jakarta text-xs text-[#74788C] mt-1 max-w-sm mx-auto">
                  Try reducing capacity requirements or unchecking specialized equipment filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {finderCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-space font-bold text-base text-[#24283B]">{c.roomCode}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E9F9F2] text-[#2E8B67] border border-[#A6E6CD] font-jakarta text-[10px] font-bold">
                          AVAILABLE NOW
                        </span>
                        <span className="font-jakarta text-xs text-[#74788C]">
                          Floor {c.floor} · {c.buildingName} ({c.buildingCode})
                        </span>
                      </div>
                      <p className="font-jakarta font-semibold text-xs text-[#24283B]">{c.roomName}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#FAF7F1] text-[#24283B] font-jakarta text-[10px] font-semibold border border-[#E7E2DD]">
                          {c.capacity} seats capacity
                        </span>
                        {c.equipment.map((eq) => (
                          <span
                            key={eq}
                            className="px-2 py-0.5 rounded-md bg-[#FAF7F1] text-[#74788C] font-jakarta text-[10px] border border-[#E7E2DD]"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => performFacultyCheckIn(c.roomCode)}
                      className="px-4 py-2 rounded-xl bg-[#24283B] text-white font-jakarta text-xs font-semibold hover:bg-[#383E58] transition-colors flex items-center gap-1.5 flex-shrink-0 shadow-pastel-sm"
                    >
                      <CheckCircle2 size={14} /> Immediate Check-In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: 3D DIGITAL TWIN OCCUPANCY VISUALIZATION */}
      {activeTab === '3d' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-[#E7E2DD] flex items-center justify-between flex-wrap gap-4 shadow-pastel-sm">
            <div>
              <h3 className="font-space font-bold text-sm text-[#24283B]">
                3D Digital Twin — Interactive CampusOps Master Geometry
              </h3>
              <p className="font-jakarta text-xs text-[#74788C]">
                Click on any building or room mesh in the 3D model to inspect live occupancy
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap text-xs font-jakarta">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FFE4CF] border border-[#FFC89E]" /> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#E6E9FF] border border-[#C5CDFF]" /> Scheduled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#D5F3E8] border border-[#A6E6CD]" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#E9DDFB] border border-[#D8C5F7]" /> Unknown
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#F8DCE8] border border-[#F2B5CD]" /> Maintenance
              </span>
            </div>
          </div>

          <div
            className="w-full h-[540px] rounded-2xl overflow-hidden border border-[#E7E2DD] relative"
            style={{ background: 'linear-gradient(160deg, #F2F4FF 0%, #E9DDFB 100%)' }}
          >
            <ThreejsErrorBoundary>
              <CampusViewer3D height="100%" onSelectBuilding={(code) => setSelectedBuildingId(code)} />
            </ThreejsErrorBoundary>

            {/* Selected Building Details Overlay */}
            {selectedBuildingId && (
              <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E7E2DD] p-4 w-80 shadow-pastel-lg animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-space font-bold text-xs uppercase tracking-wider text-[#6878CA]">
                    Selected Facility
                  </span>
                  <button
                    onClick={() => setSelectedBuildingId(null)}
                    className="p-1 rounded-lg text-[#74788C] hover:bg-[#FAF7F1]"
                  >
                    ✕
                  </button>
                </div>
                <h4 className="font-space font-bold text-base text-[#24283B]">
                  {buildings.find((b) => b.code === selectedBuildingId || b.id === selectedBuildingId)?.name || selectedBuildingId}
                </h4>

                <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto">
                  <p className="font-jakarta text-[11px] font-semibold text-[#74788C]">Mapped Classrooms:</p>
                  {classrooms
                    .filter((c) => c.buildingCode === selectedBuildingId || c.buildingId === selectedBuildingId)
                    .map((rm) => {
                      const cfg = STATUS_CONFIG[rm.status];
                      return (
                        <div
                          key={rm.id}
                          className="p-2 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-[#24283B]">{rm.roomCode}</span>
                            <p className="text-[10px] text-[#74788C]">{rm.capacity} seats</p>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border"
                            style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

