import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  FileCheck,
  ShieldCheck,
  Truck,
  Building2,
} from 'lucide-react';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';
import { ApprovalRequest } from '../../../types';

export default function ProcurementDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    approvals,
    inventory,
    stockAlerts,
    approveRequest,
    rejectRequest,
    showToast,
  } = useCampus();

  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed'>('pending');

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const reviewedApprovals = approvals.filter((a) => a.status === 'approved' || a.status === 'rejected');

  const urgentRequisitions = pendingApprovals.filter(
    (a) => a.urgency === 'high' || a.title.toLowerCase().includes('emergency')
  );

  const handleApprove = async (approval: ApprovalRequest) => {
    // Separation of duties: requester cannot approve their own request
    if (approval.requesterId === user?.id) {
      showToast(
        'Separation of Duties Enforced: You cannot approve a requisition that you requested.',
        'error'
      );
      return;
    }

    const result = await approveRequest(approval.id);
    if (result.success) {
      showToast(`Requisition "${approval.title}" approved and PO generated.`, 'success');
    } else {
      showToast((result as any).error || (result as any).message || 'Failed to approve request', 'error');
    }
  };

  const handleReject = async (approval: ApprovalRequest) => {
    const result = await rejectRequest(approval.id);
    if (result.success) showToast(`Requisition "${approval.title}" returned for revision.`, 'info');
    else showToast(result.message || 'Failed to reject request', 'error');
  };

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div
        className="relative flex flex-col md:flex-row items-start md:items-end justify-between p-6 sm:p-8 rounded-card-lg overflow-hidden border border-[#E7E2DD]"
        style={{ background: 'linear-gradient(135deg, #FEF9EE 0%, #FEF3C7 60%, #FAF7F1 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-jakarta text-[11px] font-bold">
              Procurement & Commercial Governance
            </span>
            <span className="text-xs font-jakarta text-[#74788C]">
              Approver: {user?.fullName || 'Procurement Approver'}
            </span>
          </div>
          <h1 className="font-space font-bold text-3xl sm:text-4xl text-[#24283B] tracking-tight">
            Procurement Approvals Desk.
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-2 max-w-lg leading-relaxed">
            Review departmental purchase requisitions, compare quotation pricing and lead times, authorize stock reorders, and enforce commercial separation of duties.
          </p>
        </div>

        <div className="relative z-10 mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
          <p className="font-space font-bold text-xs text-[#24283B]">{today}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/inventory')}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E2DD] text-[#24283B] hover:bg-[#FAF7F1] font-jakarta text-xs font-semibold shadow-xs"
            >
              Stock Shortages ({stockAlerts.length})
            </button>
            <button
              onClick={() => navigate('/approvals')}
              className="px-4 py-2 rounded-xl bg-[#24283B] text-white hover:bg-[#383E58] font-jakarta text-xs font-semibold shadow-pastel-sm transition-all"
            >
              All Approvals
            </button>
          </div>
        </div>
      </div>

      {/* ── Separation of Duties Banner ── */}
      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-xs font-jakarta text-blue-900 shadow-xs">
        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0" />
        <span>
          <strong>Separation of Duties Active:</strong> Approvers cannot approve requisitions they personally initiated. All authorized transactions create immutable audit trails.
        </span>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FFFBEB]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#B45309]">
              <FileCheck size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#B45309] bg-white px-2 py-0.5 rounded-full border border-[#FEF3C7]">
              Pending
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{pendingApprovals.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Requisitions To Review
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8DCE8] flex items-center justify-center text-[#BA3D6E]">
              <AlertTriangle size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#BA3D6E] bg-white px-2 py-0.5 rounded-full border border-[#F8DCE8]">
              High Urgency
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{urgentRequisitions.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Urgent Purchase Requests
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#E9F9F2]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D5F3E8] flex items-center justify-center text-[#2E8B67]">
              <Truck size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-white px-2 py-0.5 rounded-full border border-[#D5F3E8]">
              Delivered
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">84%</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            On-Time PO Receipt Rate
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#F2F4FF]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6E9FF] flex items-center justify-center text-[#4A5AA0]">
              <CreditCard size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#4A5AA0] bg-white px-2 py-0.5 rounded-full border border-[#E6E9FF]">
              Estimated
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">₹96.5K</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Pending Value
          </p>
        </div>
      </div>

      {/* ── Requisitions Queue & Quotation Details ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Requisitions List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-[#B45309]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Requisitions Awaiting Procurement Approval
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-[#FAF7F1] p-1 rounded-xl border border-[#E7E2DD]">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-jakarta font-semibold transition ${
                  activeTab === 'pending'
                    ? 'bg-white shadow-xs text-[#24283B]'
                    : 'text-[#74788C] hover:text-[#24283B]'
                }`}
              >
                Pending ({pendingApprovals.length})
              </button>
              <button
                onClick={() => setActiveTab('reviewed')}
                className={`px-3 py-1 rounded-lg text-xs font-jakarta font-semibold transition ${
                  activeTab === 'reviewed'
                    ? 'bg-white shadow-xs text-[#24283B]'
                    : 'text-[#74788C] hover:text-[#24283B]'
                }`}
              >
                Processed ({reviewedApprovals.length})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] divide-y divide-[#F6F0E5] shadow-xs">
            {(activeTab === 'pending' ? pendingApprovals : reviewedApprovals).length > 0 ? (
              (activeTab === 'pending' ? pendingApprovals : reviewedApprovals).map((app) => {
                const isSelfRequest = app.requesterId === user?.id;

                return (
                  <div key={app.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              app.urgency === 'high'
                                ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                                : 'bg-[#E6E9FF] text-[#4A5AA0]'
                            }`}
                          >
                            {app.urgency} Priority
                          </span>
                          <span className="font-space font-bold text-xs text-[#24283B]">
                            {app.title}
                          </span>
                        </div>
                        <p className="font-jakarta text-xs text-[#74788C] mt-1 leading-relaxed">
                          {app.reason}
                        </p>
                        <p className="font-jakarta text-[11px] text-[#9CA1B4] mt-1 flex items-center gap-2">
                          <span>Requested by: <strong>{app.requesterName}</strong> ({app.department})</span>
                          <span>·</span>
                          <span>Submitted: {app.submittedAt}</span>
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-space font-bold text-base text-[#24283B]">
                          {app.estimatedCost}
                        </p>
                        <span className="text-[10px] text-[#74788C] block">Quote Total</span>
                      </div>
                    </div>

                    {/* Actions if pending */}
                    {app.status === 'pending' && (
                      <div className="flex items-center justify-between pt-2 border-t border-[#F6F0E5]">
                        {isSelfRequest ? (
                          <span className="text-[11px] font-jakarta text-[#BA3D6E] bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                            ⚠ Self-approval prohibited: Requisition initiated by your account.
                          </span>
                        ) : (
                          <span className="text-[11px] font-jakarta text-[#2E8B67] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                            ✓ Eligible for commercial approval
                          </span>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => handleReject(app)}
                            className="px-3 py-1.5 rounded-xl border border-[#E7E2DD] text-xs font-semibold text-[#BA3D6E] hover:bg-[#FDF0F6] transition"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={isSelfRequest}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                              isSelfRequest
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-[#2E8B67] text-white hover:bg-[#257254]'
                            }`}
                          >
                            Approve & Issue PO
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs font-jakarta text-[#74788C]">
                No requisitions in this queue.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stock Shortages & Quotation Comparison */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#C06B33]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Critical Stock Shortages
              </h2>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline"
            >
              Inventory
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] p-4 space-y-3">
            <p className="font-jakarta text-[11px] text-[#74788C]">
              Components currently at or below minimum operating reserve threshold:
            </p>
            <div className="space-y-2">
              {stockAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs font-jakarta">
                  <div>
                    <p className="font-semibold text-amber-900">{alert.itemName}</p>
                    <p className="text-[10px] text-amber-700">{alert.category} · Threshold: {alert.threshold}</p>
                  </div>
                  <span className="font-space font-bold text-red-600 bg-white px-2 py-0.5 rounded-full border border-red-200">
                    {alert.currentStock} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier Quotation Comparisons Card */}
          <div className="p-4 rounded-card border border-[#E7E2DD] bg-[#FAF7F1] space-y-3">
            <span className="font-space font-bold text-xs text-[#24283B]">Contracted Supplier Rate Cards</span>
            <div className="space-y-2 text-xs font-jakarta">
              <div className="bg-white p-2.5 rounded-xl border border-[#E7E2DD] flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#24283B]">HVAC Systems Ltd.</p>
                  <p className="text-[10px] text-[#74788C]">Lead Time: 2-3 Days · Standard Rate</p>
                </div>
                <span className="text-[10px] font-bold text-[#2E8B67] bg-[#D5F3E8] px-2 py-0.5 rounded-full">
                  Primary
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#E7E2DD] flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#24283B]">Apex Electrical Spares</p>
                  <p className="text-[10px] text-[#74788C]">Lead Time: 24h Express (8% Premium)</p>
                </div>
                <span className="text-[10px] font-bold text-[#6878CA] bg-[#E6E9FF] px-2 py-0.5 rounded-full">
                  Fast-Track
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

