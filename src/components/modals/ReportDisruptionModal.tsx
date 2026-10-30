import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Building2, MapPin, Clock, FileText, Wrench, ShieldAlert } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { DisruptionCategory, DisruptionSeverity } from '../../types';

export default function ReportDisruptionModal() {
  const {
    isReportDisruptionOpen,
    setIsReportDisruptionOpen,
    rooms,
    buildings,
    bookings,
    incidents,
    workOrders,
    reportRoomDisruption,
    selectedBuildingId,
  } = useCampus();

  const [buildingId, setBuildingId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<DisruptionCategory>('equipment_failure');
  const [severity, setSeverity] = useState<DisruptionSeverity>('high');
  const [issue, setIssue] = useState<string>('');
  const [resolutionEta, setResolutionEta] = useState<string>('2 hours');
  const [relatedIncidentTicket, setRelatedIncidentTicket] = useState<string>('');
  const [relatedWorkOrderNumber, setRelatedWorkOrderNumber] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isReportDisruptionOpen) {
      const initialBuilding = selectedBuildingId || (buildings.length > 0 ? buildings[0].id : 'it-block');
      setBuildingId(initialBuilding);
      const bRooms = rooms.filter((r) => r.buildingId === initialBuilding);
      if (bRooms.length > 0) {
        setRoomId(bRooms[0].id);
      }
      setErrorMsg(null);
    }
  }, [isReportDisruptionOpen, selectedBuildingId, buildings, rooms]);

  const handleBuildingChange = (bId: string) => {
    setBuildingId(bId);
    const bRooms = rooms.filter((r) => r.buildingId === bId);
    if (bRooms.length > 0) {
      setRoomId(bRooms[0].id);
    } else {
      setRoomId('');
    }
  };

  const selectedRoom = rooms.find((r) => r.id === roomId);

  // Live calculation of affected bookings
  const affectedBookings = roomId
    ? bookings.filter((b) => b.roomId === roomId && b.status !== 'cancelled' && b.status !== 'rejected')
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!roomId) {
      setErrorMsg('Please select a campus room');
      return;
    }

    if (!issue.trim()) {
      setErrorMsg('Please describe the operational disruption issue');
      return;
    }

    const result = reportRoomDisruption({
      roomId,
      issue,
      reasonCategory,
      severity,
      resolutionEta,
      relatedIncidentTicket: relatedIncidentTicket || undefined,
      relatedWorkOrderNumber: relatedWorkOrderNumber || undefined,
    });

    if (result.success) {
      setIsReportDisruptionOpen(false);
      setIssue('');
    } else {
      setErrorMsg(result.message);
    }
  };

  if (!isReportDisruptionOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24283B]/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E7E2DD] shadow-pastel-lg w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F8DCE8] border border-[#F1B9D2] flex items-center justify-center text-[#BA3D6E]">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="font-space font-bold text-lg text-[#24283B]">Report Room Disruption / Emergency</h2>
              <p className="font-jakarta text-xs text-[#74788C]">
                Flag facility outages, safety closures, and initiate rapid room reallocation workflows
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReportDisruptionOpen(false)}
            className="p-2 rounded-xl text-[#74788C] hover:bg-[#E7E2DD] hover:text-[#24283B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#F8DCE8] border border-[#BA3D6E]/30 text-xs font-jakarta text-[#8A2252] flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#6878CA]" /> Building
              </label>
              <select
                value={buildingId}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#BA3D6E]"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#BA3D6E]" /> Affected Room
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#BA3D6E]"
              >
                {rooms
                  .filter((r) => !buildingId || r.buildingId === buildingId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} - {r.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Reason Category & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5">
                Disruption Category
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value as DisruptionCategory)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#BA3D6E]"
              >
                <option value="equipment_failure">Equipment / Hardware Failure</option>
                <option value="hvac_power_failure">HVAC / Power & Electrical Outage</option>
                <option value="room_unavailable">Room Unavailable / Structural Issue</option>
                <option value="maintenance_closure">Urgent Maintenance Closure</option>
                <option value="safety_hazard">Safety Hazard / Spill / Incident</option>
                <option value="emergency_building_closure">Emergency Wing Lockdown</option>
              </select>
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DisruptionSeverity)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#BA3D6E]"
              >
                <option value="critical">Critical (Immediate Halt & Evacuation)</option>
                <option value="high">High (Room Offline, Reallocate All)</option>
                <option value="medium">Medium (Partial Capacity Compromised)</option>
                <option value="low">Low (Minor Non-blocking Fault)</option>
              </select>
            </div>
          </div>

          {/* Issue description */}
          <div>
            <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5">
              Issue Summary & Diagnosis
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Electrical short circuit in primary panel, high burning odor, safety breaker tripped."
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] placeholder:text-[#74788C] bg-white focus:outline-none focus:border-[#BA3D6E]"
            />
          </div>

          {/* ETA & Integration links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-[#C06B33]" /> Estimated Downtime
              </label>
              <input
                type="text"
                placeholder="e.g. 1h 30m or 4 hours"
                value={resolutionEta}
                onChange={(e) => setResolutionEta(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <FileText size={13} className="text-[#6878CA]" /> Linked Incident (Optional)
              </label>
              <select
                value={relatedIncidentTicket}
                onChange={(e) => setRelatedIncidentTicket(e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              >
                <option value="">None / New Issue</option>
                {incidents.slice(0, 6).map((inc) => (
                  <option key={inc.id} value={inc.ticketNumber}>
                    {inc.ticketNumber} - {inc.title.slice(0, 22)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
                <Wrench size={13} className="text-[#2E8B67]" /> Linked Work Order (Optional)
              </label>
              <select
                value={relatedWorkOrderNumber}
                onChange={(e) => setRelatedWorkOrderNumber(e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
              >
                <option value="">None</option>
                {workOrders.slice(0, 6).map((wo) => (
                  <option key={wo.id} value={wo.orderNumber}>
                    {wo.orderNumber} - {wo.title.slice(0, 20)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Affected Bookings Impact Banner */}
          {affectedBookings.length > 0 ? (
            <div className="p-3.5 rounded-2xl bg-[#FFF2E7] border border-[#C06B33]/30">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle size={15} className="text-[#C06B33]" />
                <span className="font-space font-bold text-xs text-[#C06B33]">
                  {affectedBookings.length} Active Booking(s) Will Require Reallocation
                </span>
              </div>
              <div className="space-y-1.5 mt-2">
                {affectedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E7E2DD] text-xs font-jakarta"
                  >
                    <div>
                      <span className="font-space font-bold text-[#24283B]">{b.bookingNumber}</span>
                      <span className="text-[#74788C] ml-2 font-medium">{b.purpose}</span>
                    </div>
                    <span className="font-space font-semibold text-[#C06B33]">
                      {b.startTime} - {b.endTime} ({b.expectedAttendance} pax)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta text-[#74788C]">
              No confirmed bookings currently overlap with this room today.
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E2DD] bg-[#FAF7F1]">
          <button
            type="button"
            onClick={() => setIsReportDisruptionOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-xs text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#BA3D6E] text-white font-jakarta font-semibold text-xs hover:bg-[#9B2E58] transition-all shadow-pastel-sm flex items-center gap-2"
          >
            <ShieldAlert size={14} />
            Confirm Room Closure & Alert Operations
          </button>
        </div>
      </div>
    </div>
  );
}
