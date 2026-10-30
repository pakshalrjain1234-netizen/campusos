import React, { useState } from 'react';
import { X, Wrench } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { WorkOrder } from '../../types';

const PRIORITIES: { value: WorkOrder['priority']; label: string }[] = [
  { value: 'urgent', label: 'Urgent — SLA < 2h' },
  { value: 'high', label: 'High — SLA < 8h' },
  { value: 'medium', label: 'Medium — SLA < 24h' },
  { value: 'low', label: 'Low — SLA < 72h' },
];

const CATEGORIES = [
  'HVAC Overhaul', 'Electrical', 'Plumbing & Drainage', 'Structural', 'IT Infrastructure',
  'Renewable Power', 'Machinery Maintenance', 'Safety & Security', 'General Civil Works',
];

export default function CreateWorkOrderModal() {
  const { isCreateWorkOrderOpen, setIsCreateWorkOrderOpen, addWorkOrder, user, buildings, inventoryItems } = useCampus();

  const [form, setForm] = useState({
    title: '',
    category: 'General Civil Works',
    buildingId: '',
    location: '',
    priority: 'medium' as WorkOrder['priority'],
    assignedEngineer: '',
    dueDate: '',
    partsRequired: [] as string[],
    partInput: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isCreateWorkOrderOpen) return null;

  const addPart = () => {
    if (form.partInput.trim()) {
      setForm({ ...form, partsRequired: [...form.partsRequired, form.partInput.trim()], partInput: '' });
    }
  };

  const removePart = (idx: number) => {
    setForm({ ...form, partsRequired: form.partsRequired.filter((_, i) => i !== idx) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.buildingId) return;
    setSubmitting(true);
    const building = buildings.find((b) => b.id === form.buildingId);
    setTimeout(() => {
      addWorkOrder({
        title: form.title,
        category: form.category,
        buildingId: form.buildingId,
        buildingName: building?.name ?? form.buildingId,
        location: form.location,
        priority: form.priority,
        status: form.assignedEngineer ? 'in_progress' : 'unassigned',
        assignedEngineer: form.assignedEngineer || 'Unassigned',
        engineerAvatar: '',
        dueDate: form.dueDate || 'TBD',
        slaRemaining: '8h',
        completionRate: 0,
        partsRequired: form.partsRequired,
      });
      setSubmitting(false);
      setIsCreateWorkOrderOpen(false);
      setForm({ title: '', category: 'General Civil Works', buildingId: '', location: '', priority: 'medium', assignedEngineer: '', dueDate: '', partsRequired: [], partInput: '' });
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(36, 40, 59, 0.5)', backdropFilter: 'blur(8px)' }}
      onClick={() => setIsCreateWorkOrderOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-[0_32px_64px_-8px_rgba(36,40,59,0.22)] border border-[#E7E2DD] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD] bg-[#FFF2E7]">
          <div className="w-9 h-9 rounded-xl bg-[#FFE4CF] flex items-center justify-center">
            <Wrench size={18} className="text-[#C06B33]" />
          </div>
          <div className="flex-1">
            <h2 className="font-space font-bold text-base text-[#24283B]">Create Work Order</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">Issue a campus maintenance task</p>
          </div>
          <button onClick={() => setIsCreateWorkOrderOpen(false)} className="p-2 rounded-xl text-[#74788C] hover:bg-[#FFE4CF] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Work Order Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Replace chiller bypass actuator in Server Annex"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] focus:ring-2 focus:ring-[#FFE4CF] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as WorkOrder['priority'] })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white"
              >
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Building *</label>
            <select
              value={form.buildingId}
              onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white"
            >
              <option value="">Select building…</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Location / Room</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. 4th Floor Rooftop Mechanical Room"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Assigned Engineer</label>
              <input
                value={form.assignedEngineer}
                onChange={(e) => setForm({ ...form, assignedEngineer: e.target.value })}
                placeholder="Name or leave blank"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] transition-all"
              />
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Due Date</label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] transition-all"
              />
            </div>
          </div>

          {/* Parts */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Parts Required</label>
            <div className="flex gap-2">
              <input
                list="inventory-parts-list"
                value={form.partInput}
                onChange={(e) => setForm({ ...form, partInput: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPart(); } }}
                placeholder="Select catalogue part or type custom part name"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] transition-all"
              />
              <datalist id="inventory-parts-list">
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.name}>
                    [{item.sku}] {item.category} ({item.currentStock} {item.unit} available)
                  </option>
                ))}
              </datalist>
              <button type="button" onClick={addPart} className="px-4 py-2.5 rounded-xl bg-[#FFE4CF] text-[#C06B33] font-jakarta font-semibold text-sm hover:bg-[#FFC9A0] transition-colors">
                Add
              </button>
            </div>
            {form.partsRequired.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.partsRequired.map((part, idx) => (
                  <span key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6F0E5] text-[#24283B] font-jakarta text-[12px]">
                    {part}
                    <button type="button" onClick={() => removePart(idx)} className="text-[#74788C] hover:text-[#BA3D6E]"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="font-jakarta text-[11px] text-[#74788C] bg-[#FAF7F1] px-3 py-2 rounded-xl border border-[#E7E2DD]">
            ⚡ Demo environment — this work order will be stored in the local session only.
          </p>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setIsCreateWorkOrderOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-sm text-[#74788C] hover:bg-[#F6F0E5] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#24283B] font-jakarta font-semibold text-sm text-white hover:bg-[#383E58] disabled:opacity-60 transition-all">
              {submitting ? 'Creating…' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

