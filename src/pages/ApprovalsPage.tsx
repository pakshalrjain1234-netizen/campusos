import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, CheckCheck, Clock } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

const URGENCY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: '#FDF0F6', text: '#BA3D6E', label: 'High Priority' },
  medium: { bg: '#FFF2E7', text: '#C06B33', label: 'Medium Priority' },
  normal: { bg: '#F2F4FF', text: '#6878CA', label: 'Normal' },
};

export default function ApprovalsPage() {
  const { approvals, approveRequest, rejectRequest } = useCampus();
  const pending = approvals.filter(a => a.status === 'pending');
  const done = approvals.filter(a => a.status !== 'pending');

  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Approvals</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Review and action all pending campus operational requisitions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pending.length, color: '#C06B33', bg: '#FFF2E7' },
          { label: 'Approved', value: approvals.filter(a => a.status === 'approved').length, color: '#2E8B67', bg: '#E9F9F2' },
          { label: 'Declined', value: approvals.filter(a => a.status === 'rejected').length, color: '#74788C', bg: '#F6F0E5' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-card border border-[#E7E2DD]" style={{ background: s.bg }}>
            <p className="font-space font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
            <p className="font-jakarta text-[12px] text-[#74788C] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-space font-bold text-base text-[#24283B] mb-3">Awaiting Your Action</h2>
          <div className="space-y-3">
            {pending.map((appr) => {
              const ub = URGENCY_BADGE[appr.urgency];
              return (
                <div key={appr.id} className="p-5 bg-white rounded-card border border-[#E7E2DD] hover:shadow-pastel-sm transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: ub.bg, color: ub.text }}>{ub.label}</span>
                        <span className="font-jakarta text-[11px] text-[#74788C]">{appr.category}</span>
                      </div>
                      <h3 className="font-space font-bold text-[14px] text-[#24283B]">{appr.title}</h3>
                      <p className="font-jakarta text-[12px] text-[#74788C] mt-1">{appr.reason}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="font-jakarta text-[12px] text-[#74788C]">{appr.requesterName} · {appr.department}</span>
                        <span className="flex items-center gap-1 font-jakarta text-[12px] text-[#74788C]"><Clock size={11} />{appr.submittedAt}</span>
                        <span className="font-space font-bold text-[13px] text-[#24283B]">{appr.estimatedCost}</span>
                        {appr.category.toLowerCase().includes('procurement') && (
                          <Link to="/inventory" className="text-[#6878CA] hover:underline font-jakarta text-[11px] font-semibold flex items-center gap-1">
                            Inventory Hub →
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveRequest(appr.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D5F3E8] text-[#1B6648] font-jakarta font-semibold text-[12px] hover:bg-[#B8ECD8] transition-colors"
                      >
                        <CheckCheck size={13} /> Approve
                      </button>
                      <button
                        onClick={() => rejectRequest(appr.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F6F0E5] text-[#74788C] font-jakarta font-semibold text-[12px] hover:bg-[#E7E2DD] transition-colors"
                      >
                        <XCircle size={13} /> Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Done items */}
      {done.length > 0 && (
        <div>
          <h2 className="font-space font-bold text-base text-[#24283B] mb-3">Actioned</h2>
          <div className="space-y-2">
            {done.map((appr) => (
              <div key={appr.id} className="flex items-center gap-4 px-5 py-3 bg-[#FAF7F1] rounded-card border border-[#E7E2DD] opacity-70">
                {appr.status === 'approved'
                  ? <CheckCircle2 size={16} className="text-[#2E8B67] flex-shrink-0" />
                  : <XCircle size={16} className="text-[#74788C] flex-shrink-0" />}
                <p className="font-jakarta text-[13px] text-[#24283B] flex-1 truncate">{appr.title}</p>
                <span className={`font-jakarta text-[11px] font-bold ${appr.status === 'approved' ? 'text-[#2E8B67]' : 'text-[#74788C]'}`}>
                  {appr.status === 'approved' ? 'Approved' : 'Declined'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

