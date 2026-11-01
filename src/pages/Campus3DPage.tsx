import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  ZoomIn,
  Layers,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  ChevronRight,
  X,
  Sparkles,
  Plus,
  Filter,
  RotateCcw,
  MapPin,
  Crosshair,
  Image as ImageIcon,
  Flame,
  ShieldAlert,
  Sliders,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import CampusViewer3D from '../components/3d/CampusViewer3D';
import ThreejsErrorBoundary from '../components/3d/ThreejsErrorBoundary';
import IncidentDetailDrawer from '../components/modals/IncidentDetailDrawer';
import { CAMPUS_ASSETS_REGISTRY } from '../data/assetMappingData';
import {
  resolveBuildingCode,
  getFloorsForBuilding,
  THREE_BUILDING_COORDINATES,
  BuildingFloorInfo,
} from '../utils/campus3dMapping';
import {
  createDemo3DIncidents,
  resolveIncidentLocalization,
  TEMPORARY_DEMO_ROOM_MAPPINGS,
} from '../utils/incidentRoomLocalization';
import { MappedAsset, Incident } from '../types';
import { calculateBuildingHealthScore, getActiveBuildingIncidents } from '../utils/buildingHealth';

export default function Campus3DPage() {
  const {
    buildings,
    selectedBuildingId,
    setSelectedBuildingId,
    incidents,
    workOrders,
    selectedIncidentId,
    setSelectedIncidentId,
    setIsReportIncidentOpen,
  } = useCampus();

  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [showResolved, setShowResolved] = useState(false);
  const [selectedFloorLevel, setSelectedFloorLevel] = useState<number>(0);
  const [inspectingAsset, setInspectingAsset] = useState<MappedAsset | null>(null);

  // Temporary separated demo mapping incidents dataset for 3D localization demonstration
  const [demoIncidents, setDemoIncidents] = useState<Incident[]>(createDemo3DIncidents());
  const [demoScenariosActive, setDemoScenariosActive] = useState<boolean>(true);

  // Combined active incidents: merges temporary demo incidents with real database records when active
  const allIncidents = useMemo(() => {
    if (!demoScenariosActive) return incidents;
    // Prevent duplicate keys
    const realIds = new Set(incidents.map((i) => i.id));
    const nonCollidingDemo = demoIncidents.filter((d) => !realIds.has(d.id));
    return [...nonCollidingDemo, ...incidents];
  }, [demoScenariosActive, demoIncidents, incidents]);

  // Selected building object
  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    const norm = selectedBuildingId.toLowerCase();
    return (
      buildings.find(
        (b) =>
          b.id.toLowerCase() === norm ||
          b.shortName.toLowerCase() === norm ||
          b.code?.toLowerCase() === norm ||
          resolveBuildingCode(b.id) === resolveBuildingCode(selectedBuildingId)
      ) || null
    );
  }, [buildings, selectedBuildingId]);

  // Available floors for selected building
  const buildingFloors: BuildingFloorInfo[] = useMemo(() => {
    if (!selectedBuilding) return [];
    return getFloorsForBuilding(selectedBuilding.id);
  }, [selectedBuilding]);

  // Filtered incidents across the campus (strictly excludes resolved when showResolved is false)
  const activeIncidents = useMemo(() => {
    return allIncidents.filter((inc) => {
      const isResolved =
        inc.lifecycleStatus === 'closed' ||
        inc.lifecycleStatus === 'resolved' ||
        inc.status === 'resolved' ||
        inc.status === 'closed';
      if (!showResolved && isResolved) return false;
      if (priorityFilter !== 'all' && inc.severity !== priorityFilter) return false;
      return true;
    });
  }, [allIncidents, priorityFilter, showResolved]);

  // Currently selected incident object
  const currentIncident = useMemo(() => {
    if (!selectedIncidentId) return null;
    return allIncidents.find((i) => i.id === selectedIncidentId) || null;
  }, [selectedIncidentId, allIncidents]);

  // Current incident localization resolution (building, floor, exact room or null)
  const currentLocalization = useMemo(() => {
    if (!currentIncident) return null;
    return resolveIncidentLocalization(currentIncident);
  }, [currentIncident]);

  // Synchronize building and floor when an incident is selected from list, priority queue, or demo switcher
  useEffect(() => {
    if (currentIncident && currentLocalization) {
      if (currentLocalization.buildingCode) {
        setSelectedBuildingId(currentLocalization.buildingCode);
      }
      setSelectedFloorLevel(currentLocalization.floorLevel);
    }
  }, [selectedIncidentId, currentIncident, currentLocalization, setSelectedBuildingId]);

  // Incidents belonging to the selected building
  const buildingIncidents = useMemo(() => {
    if (!selectedBuilding) return [];
    const bCode = resolveBuildingCode(selectedBuilding.id);
    return activeIncidents.filter((inc) => {
      const incBCode = resolveBuildingCode(inc.buildingId || inc.building || inc.location || '');
      return incBCode === bCode;
    });
  }, [selectedBuilding, activeIncidents]);

  const buildingWorkOrders = useMemo(() => {
    if (!selectedBuilding) return [];
    const bCode = resolveBuildingCode(selectedBuilding.id);
    return workOrders.filter((w) => {
      const wBCode = resolveBuildingCode(w.buildingId || '');
      return wBCode === bCode && w.status !== 'completed' && w.status !== 'verified';
    });
  }, [selectedBuilding, workOrders]);

  // Current floor info
  const currentFloor = useMemo(() => {
    return (
      buildingFloors.find((f) => f.floorLevel === selectedFloorLevel) ||
      buildingFloors[0] ||
      null
    );
  }, [buildingFloors, selectedFloorLevel]);

  // Incidents specifically on the selected floor
  const floorIncidents = useMemo(() => {
    if (!currentFloor) return [];
    return buildingIncidents.filter((inc) => {
      const incRoom = (inc.room || '').toLowerCase();
      const floorMatch =
        incRoom.includes(currentFloor.floorLabel.toLowerCase()) ||
        currentFloor.rooms.some((r) => incRoom.includes(r.toLowerCase()));
      return floorMatch;
    });
  }, [buildingIncidents, currentFloor]);

  // Counts by priority for pills
  const priorityCounts = useMemo(() => {
    const raw = allIncidents.filter(
      (i) =>
        i.lifecycleStatus !== 'closed' &&
        i.lifecycleStatus !== 'resolved' &&
        i.status !== 'resolved' &&
        i.status !== 'closed'
    );
    return {
      all: raw.length,
      critical: raw.filter((i) => i.severity === 'critical').length,
      high: raw.filter((i) => i.severity === 'high').length,
      medium: raw.filter((i) => i.severity === 'medium').length,
      low: raw.filter((i) => i.severity === 'low').length,
    };
  }, [allIncidents]);

  // Quick demonstration switcher handler
  const handleSelectDemoScenario = (ticketNumber: string) => {
    const target = demoIncidents.find((d) => d.ticketNumber === ticketNumber);
    if (target) {
      setSelectedIncidentId(target.id);
      const loc = resolveIncidentLocalization(target);
      if (loc) {
        setSelectedBuildingId(loc.buildingCode);
        setSelectedFloorLevel(loc.floorLevel);
      }
    }
  };

  // Resolve an incident in-memory to verify count decrement and indicator disappearance
  const handleResolveCurrentIncident = () => {
    if (!currentIncident) return;
    setDemoIncidents((prev) =>
      prev.map((i) =>
        i.id === currentIncident.id
          ? { ...i, status: 'resolved', lifecycleStatus: 'resolved' }
          : i
      )
    );
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[#FAF7F1]">
      {/* Top Header & Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-white border-b border-[#E7E2DD] flex-shrink-0 flex-wrap gap-2 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-xs sm:text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="w-px h-5 bg-[#E7E2DD]" />
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#6878CA]" />
            <span className="font-space font-bold text-xs sm:text-sm text-[#24283B]">
              3D Digital Twin — Interactive Incident Localization
            </span>
          </div>
        </div>

        {/* 3D Localization Quick Demo Scenarios Ribbon */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[#FAF7F1] p-1 rounded-xl border border-[#E7E2DD]">
            <span className="font-space font-bold text-[10px] text-[#74788C] uppercase tracking-wider px-1.5 hidden lg:inline">
              Demo Scenarios:
            </span>
            <button
              onClick={() => handleSelectDemoScenario('INC-001')}
              className={`px-2.5 py-1 rounded-lg font-jakarta text-[11px] font-bold transition-all flex items-center gap-1 ${
                currentIncident?.ticketNumber === 'INC-001'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-[#24283B] border border-[#E7E2DD] hover:bg-[#FAF7F1]'
              }`}
              title="INC-001 -> Floor 1 -> Room A-102 (Electrical issue)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              INC-001 (A-102)
            </button>
            <button
              onClick={() => handleSelectDemoScenario('INC-002')}
              className={`px-2.5 py-1 rounded-lg font-jakarta text-[11px] font-bold transition-all flex items-center gap-1 ${
                currentIncident?.ticketNumber === 'INC-002'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-[#24283B] border border-[#E7E2DD] hover:bg-[#FAF7F1]'
              }`}
              title="INC-002 -> Floor 2 -> Room A-204 (HVAC issue)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              INC-002 (A-204)
            </button>
            <button
              onClick={() => handleSelectDemoScenario('INC-003')}
              className={`px-2.5 py-1 rounded-lg font-jakarta text-[11px] font-bold transition-all flex items-center gap-1 ${
                currentIncident?.ticketNumber === 'INC-003'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-[#24283B] border border-[#E7E2DD] hover:bg-[#FAF7F1]'
              }`}
              title="INC-003 -> Floor 3 -> Room A-305 (Water leakage)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              INC-003 (A-305)
            </button>
            <button
              onClick={() => handleSelectDemoScenario('INC-004')}
              className={`px-2 py-1 rounded-lg font-jakarta text-[10px] font-bold transition-all flex items-center gap-1 ${
                currentIncident?.ticketNumber === 'INC-004'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-[#74788C] border border-[#E7E2DD] hover:bg-[#FAF7F1]'
              }`}
              title="INC-004: Incident with Room location not available"
            >
              INC-004 (No Room)
            </button>
          </div>

          <div className="w-px h-5 bg-[#E7E2DD] mx-1 hidden sm:block" />

          {/* Active Only / Resolved Toggle */}
          <button
            onClick={() => setShowResolved(!showResolved)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-jakarta font-semibold border transition-colors ${
              showResolved
                ? 'bg-[#E9F9F2] text-[#2E8B67] border-[#A6E6CD]'
                : 'bg-white text-[#74788C] border-[#E7E2DD] hover:bg-[#FAF7F1]'
            }`}
          >
            {showResolved ? '✓ Showing Resolved' : 'Active Only'}
          </button>

          {/* Reset Camera Focus */}
          {(selectedBuildingId || selectedIncidentId) && (
            <button
              onClick={() => {
                setSelectedBuildingId(null);
                setSelectedIncidentId(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-[#24283B] border border-[#E7E2DD] hover:bg-[#FAF7F1] font-jakarta text-[11px] font-semibold shadow-sm"
              title="Reset 3D camera to full campus overview"
            >
              <RotateCcw size={12} /> Reset View
            </button>
          )}

          {/* Quick Report Button */}
          <button
            onClick={() => setIsReportIncidentOpen(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#24283B] text-white hover:bg-[#383E58] font-jakarta text-[11px] font-semibold shadow-pastel-sm transition-colors"
          >
            <Plus size={13} /> Report Issue
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* 3D Canvas Viewport */}
        <div
          className="relative min-h-[420px] min-w-0 flex-1 md:min-h-0"
          style={{ background: 'linear-gradient(160deg, #F2F4FF 0%, #E9DDFB 100%)' }}
        >
          <ThreejsErrorBoundary>
            <CampusViewer3D
              height="100%"
              priorityFilter={priorityFilter}
              showResolved={showResolved}
              incidents={allIncidents}
              selectedIncidentId={selectedIncidentId}
            />
          </ThreejsErrorBoundary>

          {/* Hierarchical Drill-Down Card for Selected Building */}
          {selectedBuilding && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-[440px] z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E7E2DD] shadow-[0_20px_45px_-12px_rgba(0,0,0,0.22)] p-4 max-h-[82vh] flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-[#F6F0E5]">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-space font-bold text-[10px] uppercase tracking-wider text-[#6878CA] bg-[#E6E9FF] px-2 py-0.5 rounded-full">
                      {selectedBuilding.category}
                    </span>
                    <span className="font-space font-bold text-[10px] uppercase text-[#74788C]">
                      Code: {resolveBuildingCode(selectedBuilding.id)}
                    </span>
                    {buildingIncidents.length > 0 && (
                      <span className="font-space font-bold text-[10px] uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">
                        {buildingIncidents.length} Active Issue{buildingIncidents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <h3 className="font-space font-bold text-base text-[#24283B] mt-1">
                    {selectedBuilding.name}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedBuildingId(null);
                    setSelectedIncidentId(null);
                  }}
                  className="p-1 rounded-lg text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
                  title="Close Building Drill-Down"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Hierarchy Floor Selector Tabs */}
              {buildingFloors.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-[11px] font-jakarta text-[#74788C]">
                    <span className="font-space font-bold text-[10px] uppercase tracking-wider">
                      Floor Level Selection:
                    </span>
                    <span>{buildingFloors.length} Floors Mapped</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {buildingFloors.map((floor) => {
                      const isSelectedFloor = selectedFloorLevel === floor.floorLevel;
                      // Count active incidents on this specific floor
                      const countOnFloor = buildingIncidents.filter((inc) => {
                        const r = (inc.room || '').toLowerCase();
                        return (
                          r.includes(floor.floorLabel.toLowerCase()) ||
                          floor.rooms.some((fr) => r.includes(fr.toLowerCase()))
                        );
                      }).length;

                      return (
                        <button
                          key={floor.floorLevel}
                          onClick={() => setSelectedFloorLevel(floor.floorLevel)}
                          className={`px-3 py-1.5 rounded-xl font-jakarta text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm ${
                            isSelectedFloor
                              ? 'bg-[#24283B] text-white border-[#24283B] ring-2 ring-[#24283B]/20'
                              : 'bg-white text-[#74788C] border-[#E7E2DD] hover:bg-[#FAF7F1]'
                          }`}
                        >
                          <span>{floor.floorLabel}</span>
                          {countOnFloor > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                isSelectedFloor
                                  ? 'bg-red-500 text-white'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {countOnFloor}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Floor Content: Active Incidents, Room Highlights & Assets */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {/* Active Issues on Selected Floor */}
                <div>
                  <p className="font-space font-bold text-[10px] uppercase tracking-wider text-[#74788C] mb-1.5 flex items-center gap-1">
                    <AlertTriangle size={11} /> Issues on {currentFloor?.floorLabel || 'Floor'}:
                  </p>

                  {floorIncidents.length > 0 ? (
                    <div className="space-y-1.5">
                      {floorIncidents.map((inc) => {
                        const isIncidentSelected = selectedIncidentId === inc.id;
                        return (
                          <button
                            key={inc.id}
                            onClick={() => setSelectedIncidentId(inc.id)}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs font-jakarta transition-all flex items-center justify-between group shadow-sm ${
                              isIncidentSelected
                                ? 'bg-red-500/10 border-red-500 ring-2 ring-red-400'
                                : 'bg-[#FAF7F1] hover:bg-[#F2F4FF] border-[#E7E2DD]'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#24283B]">{inc.ticketNumber}:</span>
                                <span className="font-semibold text-[#24283B] truncate">{inc.title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-[#74788C] mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <MapPin size={10} className={isIncidentSelected ? 'text-red-600' : ''} />
                                  {inc.room || 'Room location not available'}
                                </span>
                                {inc.category && (
                                  <span className="text-[#6878CA] font-semibold truncate capitalize">
                                    · {inc.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0 ${
                                inc.severity === 'critical'
                                  ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                                  : inc.severity === 'high'
                                  ? 'bg-[#FFE4CF] text-[#C06B33]'
                                  : 'bg-[#E6E9FF] text-[#4A5AA0]'
                              }`}
                            >
                              {inc.severity}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs font-jakarta text-[#2E8B67] bg-[#E9F9F2] p-2.5 rounded-xl border border-[#A6E6CD]">
                      ✓ No active disruptions reported on {currentFloor?.floorLabel}.
                    </div>
                  )}
                </div>

                {/* Explicit "Room location not available" Notice when Incident lacks room */}
                {currentIncident &&
                  currentLocalization &&
                  !currentLocalization.hasExactRoom &&
                  resolveBuildingCode(currentIncident.buildingId || '') ===
                    resolveBuildingCode(selectedBuilding.id) && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-space font-bold text-xs">Room location not available</p>
                        <p className="font-jakarta text-[11px] text-amber-800 mt-0.5">
                          {currentIncident.ticketNumber} was reported at the general facility or exterior
                          level. Physical room coordinates are unassigned.
                        </p>
                      </div>
                    </div>
                  )}

                {/* Floor Room Layout with Room-Level Highlight */}
                {currentFloor && currentFloor.rooms.length > 0 && (
                  <div>
                    <p className="font-space font-bold text-[10px] uppercase tracking-wider text-[#74788C] mb-1.5 flex items-center gap-1">
                      <Layers size={11} /> Floor Room Layout & Target Room Highlight:
                    </p>
                    <div className="space-y-2">
                      {currentFloor.rooms.map((roomName) => {
                        // Check if this room is the exact target room of the currently selected incident
                        const isSelectedIncidentRoom =
                          Boolean(currentLocalization?.hasExactRoom) &&
                          Boolean(currentLocalization?.room) &&
                          (roomName.toLowerCase().includes(currentLocalization!.room!.toLowerCase()) ||
                            currentLocalization!.room!.toLowerCase().includes(roomName.toLowerCase()));

                        // Check if this room has any other active incident
                        const roomIncident = buildingIncidents.find((inc) => {
                          const r = (inc.room || '').toLowerCase();
                          return r && (roomName.toLowerCase().includes(r) || r.includes(roomName.toLowerCase()));
                        });

                        const roomAssets = CAMPUS_ASSETS_REGISTRY.filter(
                          (a) =>
                            resolveBuildingCode(a.buildingId || a.buildingName) ===
                              resolveBuildingCode(selectedBuilding.id) &&
                            (a.room.toLowerCase().includes(roomName.toLowerCase()) ||
                              roomName.toLowerCase().includes(a.room.toLowerCase()))
                        );

                        return (
                          <div
                            key={roomName}
                            className={`p-3 rounded-xl border text-xs font-jakarta transition-all duration-300 ${
                              isSelectedIncidentRoom
                                ? 'bg-red-500/15 border-red-600 ring-4 ring-red-400/40 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
                                : roomIncident
                                ? 'bg-amber-500/10 border-amber-400'
                                : 'bg-white border-[#E7E2DD]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isSelectedIncidentRoom
                                      ? 'bg-red-600 animate-ping'
                                      : roomIncident
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                                <span
                                  className={`font-space font-bold text-xs ${
                                    isSelectedIncidentRoom ? 'text-red-700 font-extrabold' : 'text-[#24283B]'
                                  }`}
                                >
                                  {roomName}
                                </span>
                              </div>

                              {isSelectedIncidentRoom ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-space font-bold text-[9px] uppercase tracking-wider shadow-sm animate-pulse">
                                  TARGET ROOM
                                </span>
                              ) : roomIncident ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[9px] uppercase">
                                  Active Issue
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#2E8B67] font-semibold">
                                  Clear
                                </span>
                              )}
                            </div>

                            {/* Active incident details inside target room */}
                            {isSelectedIncidentRoom && currentIncident && (
                              <div className="mt-2 p-2 rounded-lg bg-red-600/10 border border-red-300 text-[11px] text-red-900 space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                  <span>
                                    {currentIncident.ticketNumber}: {currentIncident.title}
                                  </span>
                                  <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-red-600 text-white">
                                    {currentIncident.severity}
                                  </span>
                                </div>
                                <p className="text-[10px] text-red-800 leading-relaxed">
                                  {currentIncident.description}
                                </p>
                              </div>
                            )}

                            {/* Physical Assets list if available */}
                            {roomAssets.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[#F6F0E5] space-y-1">
                                <p className="text-[10px] text-[#74788C] font-semibold">
                                  Mapped Equipment ({roomAssets.length}):
                                </p>
                                {roomAssets.map((asset) => (
                                  <div
                                    key={asset.id}
                                    className="p-1.5 rounded-lg bg-[#FAF7F1] border border-[#F6F0E5] flex items-center justify-between text-[10px]"
                                  >
                                    <span className="font-semibold text-[#24283B]">{asset.name}</span>
                                    <button
                                      onClick={() => setInspectingAsset(asset)}
                                      className="text-[#4A5AA0] hover:underline font-bold"
                                    >
                                      Inspect Pin
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#F6F0E5] mt-2 flex gap-2">
                <button
                  onClick={() => setIsReportIncidentOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta text-xs font-semibold hover:bg-[#383E58] transition-colors shadow-pastel-sm"
                >
                  <Plus size={14} /> Report Issue in {selectedBuilding.shortName}
                </button>
              </div>
            </div>
          )}

          {/* Floating Selected Incident Information Panel */}
          {currentIncident && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-30 bg-slate-950/95 text-white backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-space font-bold text-xs text-red-400">
                      {currentIncident.ticketNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        currentIncident.severity === 'critical'
                          ? 'bg-red-500 text-white'
                          : currentIncident.severity === 'high'
                          ? 'bg-amber-500 text-white'
                          : 'bg-yellow-500 text-slate-900'
                      }`}
                    >
                      {currentIncident.severity}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {currentIncident.category}
                    </span>
                  </div>
                  <h4 className="font-space font-bold text-sm text-slate-100 mt-1 line-clamp-1">
                    {currentIncident.title}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedIncidentId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Close incident panel"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Exact Location Breadcrumbs */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin size={12} className="text-red-400 flex-shrink-0" />
                  <span className="font-semibold">{currentLocalization?.buildingName}</span>
                  <span className="text-slate-500">›</span>
                  <span className="text-slate-300">{currentLocalization?.floorLabel}</span>
                  <span className="text-slate-500">›</span>
                  <span
                    className={
                      currentLocalization?.hasExactRoom
                        ? 'text-red-400 font-bold'
                        : 'text-amber-400 italic'
                    }
                  >
                    {currentLocalization?.hasExactRoom
                      ? currentLocalization.room
                      : 'Room location not available'}
                  </span>
                </div>
                {currentIncident.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 pt-1">
                    {currentIncident.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleResolveCurrentIncident}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  title="Marks incident resolved to verify indicator disappearance"
                >
                  <CheckCircle2 size={13} /> Mark Resolved
                </button>
                <button
                  onClick={() => setSelectedIncidentId(currentIncident.id)}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Details
                </button>
              </div>
            </div>
          )}

          {/* Asset Photo Inspection Modal */}
          {inspectingAsset && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(36, 40, 59, 0.65)', backdropFilter: 'blur(4px)' }}
              onClick={() => setInspectingAsset(null)}
            >
              <div
                className="w-full max-w-lg bg-white rounded-2xl border border-[#E7E2DD] shadow-2xl p-5 space-y-4 animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-space font-bold text-[10px] text-[#2E8B67] bg-[#E9F9F2] px-2 py-0.5 rounded-full border border-[#A6E6CD]">
                      EXACT ASSET LOCATION PINPOINT
                    </span>
                    <h3 className="font-space font-bold text-lg text-[#24283B] mt-1">
                      {inspectingAsset.name}
                    </h3>
                    <p className="text-xs font-jakarta text-[#74788C]">
                      {inspectingAsset.buildingName} · {inspectingAsset.floor} · {inspectingAsset.room}
                    </p>
                  </div>
                  <button
                    onClick={() => setInspectingAsset(null)}
                    className="p-1.5 rounded-lg text-[#74788C] hover:bg-[#F6F0E5]"
                  >
                    <X size={18} />
                  </button>
                </div>

                {inspectingAsset.photoUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-[#E7E2DD] bg-black aspect-video select-none">
                    <img
                      src={inspectingAsset.photoUrl}
                      alt={inspectingAsset.name}
                      className="w-full h-full object-cover opacity-90"
                    />

                    {inspectingAsset.annotationCoordinates && (
                      <div
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{
                          left: `${inspectingAsset.annotationCoordinates.x}%`,
                          top: `${inspectingAsset.annotationCoordinates.y}%`,
                        }}
                      >
                        <span className="relative flex h-7 w-7">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-7 w-7 bg-red-600 border-2 border-white items-center justify-center text-white shadow-xl">
                            <Crosshair size={14} className="animate-spin" />
                          </span>
                        </span>
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap border border-slate-700 shadow-md">
                          {inspectingAsset.name}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-jakarta bg-[#FAF7F1] p-3 rounded-xl border border-[#E7E2DD]">
                  <div>
                    <span className="text-[#74788C] block text-[10px]">Category</span>
                    <strong className="text-[#24283B]">{inspectingAsset.category}</strong>
                  </div>
                  <div>
                    <span className="text-[#74788C] block text-[10px]">Serial Number</span>
                    <strong className="text-[#24283B]">{inspectingAsset.serialNumber}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingAsset(null)}
                  className="w-full py-2 bg-[#24283B] text-white rounded-xl text-xs font-semibold hover:bg-[#383E58] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Controls Hint */}
          <div className="absolute bottom-4 left-4 flex flex-col sm:flex-row gap-2 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-[#E7E2DD] shadow-pastel-sm">
              <ZoomIn size={13} className="text-[#74788C]" />
              <span className="font-jakarta text-[11px] text-[#74788C]">
                Scroll to zoom · Drag to orbit · Click building badge to drill down
              </span>
            </div>
          </div>
        </div>

        {/* Building List Sidebar Hotspots */}
        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-[#E7E2DD] flex flex-col flex-shrink-0 max-h-[38vh] md:max-h-none overflow-y-auto">
          <div className="px-5 py-3 border-b border-[#E7E2DD] bg-[#FAF7F1] sticky top-0 z-10 flex items-center justify-between">
            <div>
              <p className="font-space font-bold text-[13px] text-[#24283B]">Campus Hotspots</p>
              <p className="font-jakarta text-[11px] text-[#74788C]">
                Live incidents mapped by building
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#E6E9FF] text-[#4A5AA0] font-jakarta text-[10px] font-bold">
              {buildings.length} Mapped
            </span>
          </div>

          <div className="divide-y divide-[#F6F0E5]">
            {buildings.map((b) => {
              const bCode = resolveBuildingCode(b.id);
              const bIncidents = getActiveBuildingIncidents(b, allIncidents);
              const healthScore = calculateBuildingHealthScore(b, allIncidents);

              const activeCount = bIncidents.length;
              const hasCritical = bIncidents.some((i) => i.severity === 'critical');
              const hasHigh = bIncidents.some((i) => i.severity === 'high');

              const statusColor = activeCount > 0 ? (hasCritical ? '#BA3D6E' : '#C06B33') : '#2E8B67';
              const isSelected =
                selectedBuildingId && resolveBuildingCode(selectedBuildingId) === bCode;

              return (
                <button
                  key={b.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedBuildingId(null);
                      setSelectedIncidentId(null);
                    } else {
                      setSelectedBuildingId(b.id);
                      if (bIncidents.length > 0) {
                        setSelectedIncidentId(bIncidents[0].id);
                      }
                    }
                  }}
                  className={`w-full text-left px-5 py-3.5 transition-colors ${
                    isSelected
                      ? 'bg-[#E6E9FF]/50 border-l-4 border-l-[#4A5AA0]'
                      : 'hover:bg-[#FAF7F1]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          activeCount > 0 ? 'animate-pulse' : ''
                        }`}
                        style={{ background: statusColor }}
                      />
                      <span className="font-jakarta font-semibold text-[13px] text-[#24283B] truncate">
                        {b.shortName}
                      </span>
                    </div>
                    <span
                      className="font-space font-bold text-[13px] flex-shrink-0"
                      style={{ color: statusColor }}
                    >
                      {healthScore}%
                    </span>
                  </div>

                  <p className="font-jakarta text-[11px] text-[#74788C] mb-2 truncate">{b.name}</p>

                  <div className="flex items-center justify-between text-[11px] font-jakarta text-[#74788C]">
                    <span>
                      {b.floors} · {b.category}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: activeCount > 0 ? statusColor : '#74788C' }}
                    >
                      {activeCount} active {activeCount === 1 ? 'incident' : 'incidents'}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-[#F6F0E5] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${healthScore}%`, background: statusColor }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer />
    </div>
  );
}
