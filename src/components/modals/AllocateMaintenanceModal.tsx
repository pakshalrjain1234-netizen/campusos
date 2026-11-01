import React, { useState, useEffect } from 'react';
import { X, Wrench, UserCheck, AlertCircle, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

interface AllocateMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkOrderId?: string | null;
  onSuccess?: () => void;
}

export default function AllocateMaintenanceModal({
  isOpen,
  onClose,
  initialWorkOrderId,
  onSuccess,
}: AllocateMaintenanceModalProps) {
  const {
    workOrders,
    technicians,
    isLoadingTechnicians,
    techniciansError,
    refreshTechnicians,
    allocateWorkOrderToTechnician,
  } = useCampus();

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initial or default work order
  useEffect(() => {
    if (initialWorkOrderId) {
      setSelectedWorkOrderId(initialWorkOrderId);
    } else if (workOrders.length > 0 && !selectedWorkOrderId) {
      // Prefer unassigned work order if one exists
      const unassigned = workOrders.find((w) => w.status === 'unassigned' || !w.assignedEngineerId);
      setSelectedWorkOrderId(unassigned ? unassigned.id : workOrders[0].id);
    }
  }, [initialWorkOrderId, workOrders, selectedWorkOrderId]);

  // Sync initial or default technician
  useEffect(() => {
    if (technicians.length > 0 && !selectedTechnicianId) {
      setSelectedTechnicianId(technicians[0].id);
    }
  }, [technicians, selectedTechnicianId]);

  // Refresh technicians on open if list is empty
  useEffect(() => {
    if (isOpen && technicians.length === 0 && !isLoadingTechnicians) {
      void refreshTechnicians();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentWorkOrder = workOrders.find((w) => w.id === selectedWorkOrderId);
  const currentTechnician = technicians.find((t) => t.id === selectedTechnicianId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedWorkOrderId) {
      setValidationError('Please select a maintenance work order.');
      return;
    }

    if (!selectedTechnicianId) {
      setValidationError('Please select a technician to allocate.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await allocateWorkOrderToTechnician(
        selectedWorkOrderId,
        selectedTechnicianId,
        currentTechnician?.fullName || currentTechnician?.name
      );

      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setValidationError(res.message || 'Failed to allocate maintenance work order.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Unexpected allocation error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(36, 40, 59, 0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-[0_32px_64px_-8px_rgba(36,40,59,0.25)] border border-[#E7E2DD] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD] bg-[#FFF2E7]">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-pastel-sm">
            <UserCheck size={20} className="text-[#C06B33]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-space font-bold text-base text-[#24283B]">Allocate Maintenance Personnel</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">
              Assign verified technicians from the campus engineering directory
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#74788C] hover:bg-black/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-xs">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {techniciansError && (
            <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-[#FFF2E7] border border-[#FFE4CF] text-[#C06B33] font-jakarta text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{techniciansError}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshTechnicians()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#FFE4CF] text-[#C06B33] font-bold text-[11px] hover:bg-[#FAF7F1]"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* 1. Maintenance Work Order Selector */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Select Maintenance Work Order *
            </label>
            <select
              value={selectedWorkOrderId}
              onChange={(e) => {
                setSelectedWorkOrderId(e.target.value);
                setValidationError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
            >
              {workOrders.length === 0 ? (
                <option value="" disabled>
                  No active maintenance work orders available
                </option>
              ) : (
                workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    [{wo.orderNumber}] {wo.title} ({wo.status.replace('_', ' ')})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Selected Work Order Preview Card */}
          {currentWorkOrder && (
            <div className="p-3.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#74788C]">Facility Location:</span>
                <span className="font-semibold text-[#24283B]">
                  {currentWorkOrder.buildingName} · {currentWorkOrder.location}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74788C]">Current Assignment:</span>
                <span className={`font-semibold ${currentWorkOrder.assignedEngineer === 'Unassigned' ? 'text-[#BA3D6E]' : 'text-[#2E8B67]'}`}>
                  {currentWorkOrder.assignedEngineer}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74788C]">Priority Level:</span>
                <span className="font-bold text-[#C06B33] uppercase text-[11px]">
                  {currentWorkOrder.priority}
                </span>
              </div>
            </div>
          )}

          {/* 2. Allocate Technician Dropdown Component */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-jakarta text-[12px] font-semibold text-[#24283B]">
                Allocate Technician / Personnel *
              </label>
              <button
                type="button"
                onClick={() => void refreshTechnicians()}
                disabled={isLoadingTechnicians}
                className="text-[11px] font-jakarta text-[#74788C] hover:text-[#C06B33] flex items-center gap-1 transition-colors"
                title="Refresh technician list from database"
              >
                <RefreshCw size={11} className={isLoadingTechnicians ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {isLoadingTechnicians ? (
              <div className="w-full py-4 px-3 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] flex items-center justify-center gap-2 text-xs font-jakarta text-[#74788C]">
                <Loader2 size={16} className="animate-spin text-[#C06B33]" />
                <span>Loading technicians from campus database...</span>
              </div>
            ) : technicians.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#F8DCE8] border border-[#F2B5CD] text-[#BA3D6E] text-xs font-jakarta space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle size={14} /> No active technicians available
                </div>
                <p className="text-[11px]">
                  No user records with the role &quot;technician&quot; are currently registered or active in the database.
                </p>
              </div>
            ) : (
              <select
                value={selectedTechnicianId}
                onChange={(e) => {
                  setSelectedTechnicianId(e.target.value);
                  setValidationError(null);
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
              >
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.fullName || tech.name} — {tech.department || 'Facilities & Engineering'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Technician Card */}
          {currentTechnician && (
            <div className="p-3.5 rounded-xl bg-[#E9F9F2] border border-[#C5EFE0] flex items-center gap-3 text-xs font-jakarta">
              <div className="w-9 h-9 rounded-full bg-[#1B6648] text-white flex items-center justify-center font-bold font-space flex-shrink-0">
                {(currentTechnician.fullName || currentTechnician.name).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#24283B] truncate">
                    {currentTechnician.fullName || currentTechnician.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#D5F3E8] text-[#1B6648] text-[10px] font-bold">
                    TECHNICIAN
                  </span>
                </div>
                <p className="text-[11px] text-[#74788C] truncate mt-0.5">
                  {currentTechnician.email} · {currentTechnician.department || 'Facility Engineering'}
                </p>
              </div>
            </div>
          )}

          <p className="font-jakarta text-[11px] text-[#74788C] bg-[#FAF7F1] px-3.5 py-2 rounded-xl border border-[#E7E2DD]">
            🔒 Allocating maintenance assigns responsibility to the technician, moves unassigned tickets to In Progress, and logs an authorized audit entry.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-sm text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isLoadingTechnicians || technicians.length === 0}
              className="flex-1 px-4 py-2.5 rounded-xl font-jakarta font-semibold text-sm text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              style={{ background: '#24283B' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Allocating…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Confirm Allocation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

