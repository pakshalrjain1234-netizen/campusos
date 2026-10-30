import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Incident } from '../../types';
import { CAMPUS_BUILDINGS } from '../../data/buildingsData';

const CATEGORIES: Incident['category'][] = [
  'Electrical', 'Plumbing', 'HVAC', 'Structural', 'IT / Network', 'Safety', 'General',
];

const SEVERITIES: { value: Incident['severity']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-[#E6E9FF] text-[#4A5AA0]' },
  { value: 'medium', label: 'Medium', color: 'bg-[#FFE4CF] text-[#C06B33]' },
  { value: 'high', label: 'High', color: 'bg-[#F8DCE8] text-[#BA3D6E]' },
  { value: 'critical', label: 'Critical', color: 'bg-[#BA3D6E] text-white' },
];

export default function ReportIncidentModal() {
  const { isReportIncidentOpen, setIsReportIncidentOpen, addIncident, user, buildings } = useCampus();

  const [form, setForm] = useState({
    title: '',
    category: 'General' as Incident['category'],
    severity: 'medium' as Incident['severity'],
    buildingId: '',
    floor: '',
    room: '',
    description: '',
    reportedBy: user.name,
    reportedRole: user.role as string,
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isReportIncidentOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.buildingId || !form.description) return;
    setSubmitting(true);
    const building = buildings.find((b) => b.id === form.buildingId);
    setTimeout(() => {
      addIncident({
        ...form,
        buildingName: building?.name ?? form.buildingId,
        status: 'open',
        slaDeadline: 'In 6h',
        isDemo: true,
      });
      setSubmitting(false);
      setIsReportIncidentOpen(false);
      setForm({ title: '', category: 'General', severity: 'medium', buildingId: '', floor: '', room: '', description: '', reportedBy: user.name, reportedRole: user.role });
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(36, 40, 59, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={() => setIsReportIncidentOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-[0_32px_64px_-8px_rgba(36,40,59,0.22)] border border-[#E7E2DD] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="w-9 h-9 rounded-xl bg-[#F8DCE8] flex items-center justify-center">
            <AlertTriangle size={18} className="text-[#BA3D6E]" />
          </div>
          <div className="flex-1">
            <h2 className="font-space font-bold text-base text-[#24283B]">Report an Incident</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">Log a new campus operational issue</p>
          </div>
          <button onClick={() => setIsReportIncidentOpen(false)} className="p-2 rounded-xl text-[#74788C] hover:bg-[#F8DCE8] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Incident Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Water leak in Mechanical Block lab ceiling"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] transition-all"
            />
          </div>

          {/* Category + Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Incident['category'] })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-white"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Severity *</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as Incident['severity'] })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-white"
              >
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Building */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Building *</label>
            <select
              value={form.buildingId}
              onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-white"
            >
              <option value="">Select a building…</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Floor + Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Floor</label>
              <input
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="e.g. 3rd Floor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] transition-all"
              />
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Room / Lab</label>
              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Lab 301"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the issue in detail — what you observed, when it started, any visible damage…"
              required
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] transition-all resize-none"
            />
          </div>

          {/* Reporter info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Your Name</label>
              <input
                value={form.reportedBy}
                onChange={(e) => setForm({ ...form, reportedBy: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-[#FAF7F1] transition-all"
              />
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Role</label>
              <input
                value={form.reportedRole}
                onChange={(e) => setForm({ ...form, reportedRole: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-[#FAF7F1] transition-all"
              />
            </div>
          </div>

          {/* Demo notice */}
          <p className="font-jakarta text-[11px] text-[#74788C] bg-[#FAF7F1] px-3 py-2 rounded-xl border border-[#E7E2DD]">
            ⚡ This is a demo environment. Submitted data will be stored in the local session only and will not be sent to any backend.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsReportIncidentOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-sm text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#24283B] font-jakarta font-semibold text-sm text-white hover:bg-[#383E58] disabled:opacity-60 transition-all"
            >
              {submitting ? 'Submitting…' : 'Submit Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
