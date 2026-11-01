import React, { useState } from 'react';
import { 
  X, AlertTriangle, Clock, Building2, User, CheckCircle2, 
  ArrowRight, ShieldAlert, Sparkles, Wrench, ExternalLink, 
  ChevronRight, Activity, CornerDownRight, AlertOctagon, Eye,
  MapPin, Crosshair, Layers, Cpu
} from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { useAuth } from '../../context/AuthContext';
import { Incident, IncidentLifecycleStatus } from '../../types';
import { LIFECYCLE_BADGES, LIFECYCLE_TRANSITIONS, isTransitionAllowed } from '../../utils/incidentStateMachine';
import { rankEngineersForIncident } from '../../utils/assignmentEngine';
import { useNavigate } from 'react-router-dom';
import { CAMPUS_ASSETS_REGISTRY } from '../../data/assetMappingData';

const SEV_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#F8DCE8', text: '#BA3D6E', border: '#F2B5CD' },
  high: { bg: '#FFE4CF', text: '#C06B33', border: '#FFC89E' },
  medium: { bg: '#E6E9FF', text: '#4A5AA0', border: '#C5CDFF' },
  low: { bg: '#D5F3E8', text: '#2E8B67', border: '#A6E6CD' },
};

export default function IncidentDetailDrawer() {
  const { 
    incidents, 
    workOrders,
    technicians,
    selectedIncidentId, 
    setSelectedIncidentId, 
    transitionIncidentStatus,
    setIsCreateWorkOrderOpen,
    setSelectedBuildingId,
    showToast
  } = useCampus();

  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [transitionRemarks, setTransitionRemarks] = useState('');
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<IncidentLifecycleStatus | null>(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  if (!selectedIncidentId) return null;

  const incident = incidents.find((i) => i.id === selectedIncidentId);
  if (!incident) return null;

  const currentStatus: IncidentLifecycleStatus = (incident.lifecycleStatus as IncidentLifecycleStatus) || 'reported';
  const currentRule = LIFECYCLE_TRANSITIONS[currentStatus];
  const userRole = authUser?.role || 'coo';

  const sevBadge = SEV_BADGES[incident.severity] || SEV_BADGES.medium;
  const statusBadge = LIFECYCLE_BADGES[currentStatus] || LIFECYCLE_BADGES.reported;

  // Engineer assignment recommendations
  const rankedEngineers = rankEngineersForIncident(incident.category);

  // Mapped physical asset details & location level
  const mappedAsset = CAMPUS_ASSETS_REGISTRY.find(
    (a) =>
      a.id === incident.assetId ||
      (incident.assetName && a.name.toLowerCase() === incident.assetName.toLowerCase())
  );
  const locationLevel =
    incident.mappedLocationLevel ||
    (incident.assetId ? 'asset' : incident.room ? 'room' : incident.floor ? 'floor' : 'building');
  const annotationCoords = incident.annotationCoordinates || mappedAsset?.annotationCoordinates;
  const photoUrl = incident.evidenceUrls?.[0] || mappedAsset?.photoUrl;

  const handleTransition = (target: IncidentLifecycleStatus, customRemarks?: string) => {
    const check = isTransitionAllowed(currentStatus, target, userRole as any);
    if (!check.allowed) {
      showToast(check.reason || 'Transition not permitted for your role', 'error');
      return;
    }

    const success = transitionIncidentStatus(
      incident.id, 
      target, 
      customRemarks || transitionRemarks || `Transitioned to ${target} by ${authUser?.fullName || 'User'}`
    );

    if (success) {
      setTransitionRemarks('');
      setSelectedTargetStatus(null);
    }
  };

  const handleAssignEngineer = (engId: string, engName: string) => {
    transitionIncidentStatus(
      incident.id, 
      'assigned', 
      `Assigned to engineer ${engName}`, 
      engId, 
      engName
    );
    setShowAssignDropdown(false);
  };

  const handleOpenWorkOrderModal = () => {
    setSelectedIncidentId(incident.id);
    setIsCreateWorkOrderOpen(true);
  };

  const handleInspectIn3D = () => {
    setSelectedBuildingId(incident.buildingId);
    setSelectedIncidentId(incident.id);
    navigate('/campus-3d');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(36, 40, 59, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={() => setSelectedIncidentId(null)}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-[0_0_60px_rgba(0,0,0,0.18)] border-l border-[#E7E2DD] flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-[#E7E2DD] bg-[#FAF7F1] flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-space font-bold text-sm tracking-wider text-[#24283B]">
                {incident.ticketNumber}
              </span>
              <span 
                className="px-2.5 py-0.5 rounded-full font-jakarta text-[11px] font-bold border"
                style={{ background: sevBadge.bg, color: sevBadge.text, borderColor: sevBadge.border }}
              >
                {incident.severity.toUpperCase()}
              </span>
              <span 
                className="px-2.5 py-0.5 rounded-full font-jakarta text-[11px] font-bold border"
                style={{ background: statusBadge.bg, color: statusBadge.text, borderColor: statusBadge.border }}
              >
                {statusBadge.label}
              </span>
              {incident.isSlaBreached && (
                <span className="px-2 py-0.5 rounded-full bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-[10px] font-bold flex items-center gap-1 border border-[#F2B5CD]">
                  <AlertOctagon size={11} /> SLA BREACHED
                </span>
              )}
            </div>
            <h2 className="font-space font-bold text-lg text-[#24283B] leading-snug">
              {incident.title}
            </h2>
            <div className="flex items-center gap-3 text-xs font-jakarta text-[#74788C]">
              <span className="flex items-center gap-1"><Building2 size={13} /> {incident.buildingName} {incident.room ? `· ${incident.room}` : ''}</span>
              <span>·</span>
              <span>Reported by {incident.reportedBy} ({incident.reportedRole})</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {incident.createdAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInspectIn3D}
              title="Inspect building in 3D Campus"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E7E2DD] bg-white font-jakarta text-xs text-[#24283B] hover:bg-[#F6F0E5] transition-colors"
            >
              <Eye size={13} /> View 3D
            </button>
            <button
              onClick={() => setSelectedIncidentId(null)}
              className="p-2 rounded-xl text-[#74788C] hover:bg-[#E7E2DD] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Action Ribbon: State Machine Transitions */}
          <div className="p-4 rounded-2xl bg-[#F6F0E5] border border-[#E7E2DD] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                Lifecycle State Machine ({currentStatus.toUpperCase()})
              </span>
              <span className="font-jakarta text-[11px] text-[#74788C]">
                Role: <strong className="text-[#24283B]">{userRole.toUpperCase()}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {currentRule?.allowedNext.map((nextState: any) => {
                const isAllowed = isTransitionAllowed(currentStatus, nextState, userRole as any).allowed;
                const nextBadge = LIFECYCLE_BADGES[nextState as IncidentLifecycleStatus];

                return (
                  <button
                    key={nextState}
                    onClick={() => {
                      if (nextState === 'assigned') {
                        setShowAssignDropdown((prev) => !prev);
                      } else {
                        handleTransition(nextState);
                      }
                    }}
                    disabled={!isAllowed}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-jakarta text-xs font-bold transition-all shadow-sm ${
                      isAllowed
                        ? 'bg-[#24283B] text-white hover:bg-[#383E58]'
                        : 'bg-white text-[#A0A4B8] border border-[#E7E2DD] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    Move to {nextBadge.label} <ArrowRight size={13} />
                  </button>
                );
              })}

              {/* Direct Work Order Button / Linked WO Link */}
              {(() => {
                const linkedWO = incident.workOrderId ? workOrders.find((w) => w.id === incident.workOrderId) : null;
                if (linkedWO) {
                  return (
                    <button
                      onClick={() => {
                        setSelectedIncidentId(null);
                        navigate('/maintenance');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E6E9FF] border border-[#C5CDFF] text-[#4A5AA0] font-jakarta text-xs font-bold hover:bg-[#D5DAFF] transition-colors ml-auto shadow-pastel-sm"
                    >
                      <Wrench size={13} /> {linkedWO.orderNumber} ({linkedWO.status.toUpperCase()})
                    </button>
                  );
                }
                return (
                  <button
                    onClick={handleOpenWorkOrderModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#C06B33] text-[#C06B33] font-jakarta text-xs font-bold hover:bg-[#FFF2E7] transition-colors ml-auto shadow-pastel-sm"
                  >
                    <Wrench size={13} /> Convert to Work Order
                  </button>
                );
              })()}
            </div>

            {/* Smart Engineer Quick Assign Dropdown if toggled */}
            {showAssignDropdown && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-[#E7E2DD] space-y-2">
                <p className="font-space font-bold text-xs text-[#24283B]">Select Technician for Assignment:</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {technicians.length > 0
                    ? technicians.map((tech) => (
                        <button
                          key={tech.id}
                          onClick={() => handleAssignEngineer(tech.id, tech.fullName || tech.name)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#F6F0E5] text-left text-xs font-jakarta transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1B6648] text-white flex items-center justify-center font-bold text-[10px]">
                              {(tech.fullName || tech.name).charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-[#24283B]">{tech.fullName || tech.name}</p>
                              <p className="text-[10px] text-[#74788C]">{tech.department || 'Facility Engineering'}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-[#2E8B67] bg-[#D5F3E8] px-2 py-0.5 rounded-full">
                            Technician
                          </span>
                        </button>
                      ))
                    : rankedEngineers.map((re) => (
                        <button
                          key={re.engineer.id}
                          onClick={() => handleAssignEngineer(re.engineer.id, re.engineer.name)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#F6F0E5] text-left text-xs font-jakarta transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <img src={re.engineer.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <div>
                              <p className="font-bold text-[#24283B]">{re.engineer.name}</p>
                              <p className="text-[10px] text-[#74788C]">{re.engineer.department} · {re.matchReasons[0]}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-[#2E8B67] bg-[#D5F3E8] px-2 py-0.5 rounded-full">
                            {re.matchScore}% match
                          </span>
                        </button>
                      ))}
                </div>
              </div>
            )}
          </div>

          {/* Description Card */}
          <div className="space-y-2">
            <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#74788C]">
              Issue Description
            </h3>
            <div className="p-4 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] leading-relaxed">
              {incident.description}
            </div>
          </div>

          {/* Physical Location & Asset Mapping Card */}
          <div className="p-4 rounded-2xl bg-white border border-[#E7E2DD] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-[#BA3D6E]" />
                <h4 className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                  Physical Campus Location & Asset Linkage
                </h4>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold border ${
                  locationLevel === 'asset'
                    ? 'bg-[#E9F9F2] text-[#2E8B67] border-[#A6E6CD]'
                    : locationLevel === 'room'
                    ? 'bg-[#E6E9FF] text-[#4A5AA0] border-[#C5CDFF]'
                    : locationLevel === 'floor'
                    ? 'bg-[#FFE4CF] text-[#C06B33] border-[#FFC89E]'
                    : 'bg-[#FAF7F1] text-[#74788C] border-[#E7E2DD]'
                }`}
              >
                {locationLevel === 'asset' && '✓ EXACT ASSET PINPOINT'}
                {locationLevel === 'room' && 'ROOM LEVEL VERIFIED'}
                {locationLevel === 'floor' && 'FLOOR LEVEL GENERAL'}
                {locationLevel === 'building' && 'BUILDING LEVEL ZONE'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-jakarta">
              <div className="p-2 bg-[#FAF7F1] rounded-xl border border-[#E7E2DD]">
                <span className="text-[10px] text-[#74788C] block">Building</span>
                <strong className="text-[#24283B]">{incident.buildingName || incident.buildingId}</strong>
              </div>
              <div className="p-2 bg-[#FAF7F1] rounded-xl border border-[#E7E2DD]">
                <span className="text-[10px] text-[#74788C] block">Floor</span>
                <strong className="text-[#24283B]">{incident.floor || 'Floor 1 / General'}</strong>
              </div>
              <div className="p-2 bg-[#FAF7F1] rounded-xl border border-[#E7E2DD]">
                <span className="text-[10px] text-[#74788C] block">Room / Zone</span>
                <strong className="text-[#24283B]">{incident.room || 'General Area'}</strong>
              </div>
            </div>

            {/* Mapped Asset Information */}
            {(incident.assetName || mappedAsset) && (
              <div className="p-3 bg-[#F2F4FF] rounded-xl border border-[#E6E9FF] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={14} className="text-[#6878CA]" />
                    <span className="font-space font-bold text-xs text-[#24283B]">
                      {incident.assetName || mappedAsset?.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#6878CA] bg-white px-2 py-0.5 rounded-full border border-[#E6E9FF]">
                    {incident.assetCategory || mappedAsset?.category || 'Mechanical / Electrical'}
                  </span>
                </div>
                {mappedAsset && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-jakarta text-[#74788C] pt-1 border-t border-[#E6E9FF]/60">
                    <div>Serial: <strong className="text-[#24283B]">{mappedAsset.serialNumber}</strong></div>
                    <div>Last Serviced: <strong className="text-[#2E8B67]">{mappedAsset.lastServicedDate}</strong></div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Photo with Visual Coordinate Pin */}
            {photoUrl && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-jakarta">
                  <span className="font-semibold text-[#24283B] flex items-center gap-1">
                    <Crosshair size={13} className="text-[#BA3D6E]" />
                    Photo Annotation Pinpoint:
                  </span>
                  {annotationCoords && (
                    <span className="text-[10px] text-[#74788C]">
                      Target: ({annotationCoords.x.toFixed(1)}%, {annotationCoords.y.toFixed(1)}%)
                    </span>
                  )}
                </div>
                <div className="relative rounded-xl overflow-hidden border border-[#E7E2DD] bg-slate-900 aspect-video select-none group">
                  <img
                    src={photoUrl}
                    alt="Asset defect inspection"
                    className="w-full h-full object-cover"
                  />
                  {annotationCoords && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${annotationCoords.x}%`,
                        top: `${annotationCoords.y}%`,
                      }}
                    >
                      <span className="relative flex h-8 w-8">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-8 w-8 bg-red-600 border-2 border-white items-center justify-center text-white shadow-xl">
                          <Crosshair size={16} className="animate-spin" />
                        </span>
                      </span>
                      <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap border border-slate-700 shadow-md">
                        {incident.assetName || 'Defect Location'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Intelligent Triage Score & Risk Breakdown */}
          {incident.triageDetails && (
            <div className="p-4 rounded-2xl bg-[#F2F4FF] border border-[#E6E9FF] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#6878CA]" />
                  <h4 className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                    Multi-Factor Intelligent Triage Breakdown
                  </h4>
                </div>
                <span className="font-jakarta text-[10px] font-bold text-[#6878CA] bg-white px-2.5 py-0.5 rounded-full border border-[#E6E9FF]">
                  Deterministic Score: {incident.triageDetails.score}/100
                </span>
              </div>

              <p className="font-jakarta text-xs text-[#24283B] bg-white p-3 rounded-xl border border-[#E6E9FF]">
                <strong>Rule-Based Reasoning:</strong> {incident.triageDetails.reason}
              </p>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-[#E6E9FF]">
                  <p className="font-jakarta text-[10px] text-[#74788C]">Safety Risk</p>
                  <p className="font-space font-bold text-xs text-[#BA3D6E] uppercase mt-0.5">
                    {incident.triageDetails.safetyRisk}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#E6E9FF]">
                  <p className="font-jakarta text-[10px] text-[#74788C]">Disruption</p>
                  <p className="font-space font-bold text-xs text-[#C06B33] uppercase mt-0.5">
                    {incident.triageDetails.disruptionLevel}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#E6E9FF]">
                  <p className="font-jakarta text-[10px] text-[#74788C]">People Impact</p>
                  <p className="font-space font-bold text-xs text-[#24283B] mt-0.5">
                    {incident.triageDetails.peopleAffected} students/staff
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#E6E9FF]">
                  <p className="font-jakarta text-[10px] text-[#74788C]">Facility Zone</p>
                  <p className="font-space font-bold text-xs text-[#4A5AA0] uppercase mt-0.5">
                    {incident.triageDetails.facilityCriticality}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] font-jakarta text-[#74788C]">
                <span>Ack Target: <strong>&lt; {incident.triageDetails.ackTargetMinutes < 60 ? `${incident.triageDetails.ackTargetMinutes}m` : `${Math.round(incident.triageDetails.ackTargetMinutes / 60)}h`}</strong></span>
                <span>Resolution Target: <strong>&lt; {incident.triageDetails.resolutionTargetHours}h</strong></span>
                <span className="text-[#2E8B67] font-semibold">Gemini AI Hook Ready</span>
              </div>
            </div>
          )}

          {/* Engineer Assignment Recommendation Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#74788C]">
                Smart Engineer Assignment Ranking
              </h3>
              <span className="font-jakarta text-[11px] text-[#74788C]">
                Category: <strong>{incident.category}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {rankedEngineers.slice(0, 3).map((rec, i) => (
                <div 
                  key={rec.engineer.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    rec.isRecommended 
                      ? 'bg-[#E9F9F2] border-[#A6E6CD] shadow-sm' 
                      : 'bg-white border-[#E7E2DD]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={rec.engineer.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-space font-bold text-sm text-[#24283B]">{rec.engineer.name}</span>
                        {rec.isRecommended && (
                          <span className="px-2 py-0.5 rounded-full bg-[#2E8B67] text-white font-jakarta text-[10px] font-bold">
                            TOP MATCH
                          </span>
                        )}
                      </div>
                      <p className="font-jakarta text-xs text-[#74788C] mt-0.5">
                        {rec.engineer.department} · {rec.matchReasons.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-space font-bold text-sm text-[#24283B]">{rec.matchScore}%</p>
                      <p className="font-jakarta text-[10px] text-[#74788C]">Fit Score</p>
                    </div>
                    {currentStatus !== 'closed' && (
                      <button
                        onClick={() => handleAssignEngineer(rec.engineer.id, rec.engineer.name)}
                        className="px-3 py-1.5 rounded-xl bg-[#24283B] text-white font-jakarta text-xs font-semibold hover:bg-[#383E58] transition-colors"
                      >
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evidence Attachments Gallery */}
          {incident.evidenceUrls && incident.evidenceUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#74788C]">
                Evidence Attachments
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {incident.evidenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative rounded-xl overflow-hidden border border-[#E7E2DD] bg-[#FAF7F1] block aspect-video hover:opacity-90 transition-opacity"
                  >
                    <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-jakarta text-xs font-bold flex items-center gap-1">
                        <ExternalLink size={14} /> Open Full Size
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Full Audit Trail / Timeline */}
          <div className="space-y-3 pt-2">
            <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#74788C]">
              Audit Trail & Lifecycle Transitions
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E2DD]">
              {(incident.timeline || [
                {
                  id: 'def-1',
                  incidentId: incident.id,
                  fromStatus: undefined,
                  toStatus: 'reported',
                  actorName: incident.reportedBy,
                  actorRole: incident.reportedRole,
                  remarks: 'Incident initial submission',
                  createdAt: incident.createdAt,
                }
              ]).map((evt, idx) => {
                const targetBadge = LIFECYCLE_BADGES[evt.toStatus as IncidentLifecycleStatus] || LIFECYCLE_BADGES.reported;

                return (
                  <div key={evt.id || idx} className="relative">
                    <div 
                      className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                      style={{ background: targetBadge.text }}
                    />
                    <div className="bg-white p-3.5 rounded-xl border border-[#E7E2DD] shadow-pastel-sm">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span 
                            className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold border"
                            style={{ background: targetBadge.bg, color: targetBadge.text, borderColor: targetBadge.border }}
                          >
                            {targetBadge.label.toUpperCase()}
                          </span>
                          <span className="font-jakarta text-xs font-semibold text-[#24283B]">
                            {evt.actorName} <span className="text-[#74788C] font-normal">({evt.actorRole})</span>
                          </span>
                        </div>
                        <span className="font-jakarta text-[11px] text-[#74788C]">{evt.createdAt}</span>
                      </div>
                      {evt.remarks && (
                        <p className="font-jakarta text-xs text-[#74788C] mt-2 bg-[#FAF7F1] p-2 rounded-lg border border-[#E7E2DD]">
                          {evt.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-[#E7E2DD] bg-[#FAF7F1] flex items-center justify-between">
          <span className="font-jakarta text-xs text-[#74788C]">
            Ticket ID: <code className="text-[#24283B]">{incident.id}</code>
          </span>
          <button
            onClick={() => setSelectedIncidentId(null)}
            className="px-4 py-2 rounded-xl bg-white border border-[#E7E2DD] font-jakarta text-xs font-semibold text-[#24283B] hover:bg-[#F6F0E5] transition-colors"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
