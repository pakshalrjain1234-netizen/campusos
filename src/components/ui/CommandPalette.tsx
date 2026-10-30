import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, LayoutDashboard, AlertTriangle, Building2, Wrench,
  Package, CalendarDays, Radar, CheckCircle2, BarChart3, Settings,
  Plus, FileText, ArrowRight,
} from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  group: string;
  action: () => void;
  shortcut?: string;
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setIsReportIncidentOpen,
    setIsCreateWorkOrderOpen,
  } = useCampus();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, [setIsCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isCommandPaletteOpen]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  const allItems: CommandItem[] = [
    { id: 'nav-dashboard', label: 'Go to Overview', description: 'Campus pulse dashboard', icon: LayoutDashboard, group: 'Navigate', action: () => { navigate('/dashboard'); close(); } },
    { id: 'nav-incidents', label: 'Go to Incidents', description: 'View all open tickets', icon: AlertTriangle, group: 'Navigate', action: () => { navigate('/incidents'); close(); } },
    { id: 'nav-3d', label: 'Go to 3D Campus', description: 'Interactive campus model', icon: Building2, group: 'Navigate', action: () => { navigate('/campus-3d'); close(); } },
    { id: 'nav-maintenance', label: 'Go to Maintenance', description: 'Work orders & scheduling', icon: Wrench, group: 'Navigate', action: () => { navigate('/maintenance'); close(); } },
    { id: 'nav-inventory', label: 'Go to Inventory', description: 'Assets and stock levels', icon: Package, group: 'Navigate', action: () => { navigate('/inventory'); close(); } },
    { id: 'nav-bookings', label: 'Go to Room Booking', description: 'Reserve campus spaces', icon: CalendarDays, group: 'Navigate', action: () => { navigate('/bookings'); close(); } },
    { id: 'nav-risk', label: 'Go to Risk Radar', description: 'Predictive campus risk analysis', icon: Radar, group: 'Navigate', action: () => { navigate('/risk-radar'); close(); } },
    { id: 'nav-approvals', label: 'Go to Approvals', description: '3 pending requests', icon: CheckCircle2, group: 'Navigate', action: () => { navigate('/approvals'); close(); } },
    { id: 'nav-analytics', label: 'Go to Analytics', description: 'Reports and insights', icon: BarChart3, group: 'Navigate', action: () => { navigate('/analytics'); close(); } },
    { id: 'nav-settings', label: 'Go to Settings', description: 'System configuration', icon: Settings, group: 'Navigate', action: () => { navigate('/settings'); close(); } },
    { id: 'act-report', label: 'Report an Incident', description: 'Log a new campus incident', icon: Plus, group: 'Quick Actions', shortcut: 'Shift+R', action: () => { setIsReportIncidentOpen(true); close(); } },
    { id: 'act-workorder', label: 'Create Work Order', description: 'Issue a maintenance work order', icon: FileText, group: 'Quick Actions', shortcut: 'Shift+W', action: () => { setIsCreateWorkOrderOpen(true); close(); } },
    { id: 'act-room', label: 'Book a Room', description: 'Reserve a campus space', icon: CalendarDays, group: 'Quick Actions', action: () => { navigate('/bookings'); close(); } },
    { id: 'act-inventory', label: 'Check Inventory', description: 'View stock levels', icon: Package, group: 'Quick Actions', action: () => { navigate('/inventory'); close(); } },
  ];

  const filtered = query.trim().length === 0
    ? allItems
    : allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.description ?? '').toLowerCase().includes(query.toLowerCase())
      );

  const groups = [...new Set(filtered.map((i) => i.group))];

  // Arrow key navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => Math.min(p + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => Math.max(p - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); filtered[activeIndex]?.action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isCommandPaletteOpen, filtered, activeIndex]);

  // Reset active index on query change
  useEffect(() => { setActiveIndex(0); }, [query]);

  if (!isCommandPaletteOpen) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(36, 40, 59, 0.45)', backdropFilter: 'blur(6px)' }}
      onClick={close}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-[0_32px_64px_-8px_rgba(36,40,59,0.22)] border border-[#E7E2DD] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E7E2DD]">
          <Search size={18} className="text-[#74788C] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 font-jakarta text-[15px] text-[#24283B] placeholder:text-[#74788C] bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#74788C] hover:text-[#24283B]">
              <X size={15} />
            </button>
          )}
          <kbd className="font-jakarta text-[11px] text-[#74788C] bg-[#F6F0E5] border border-[#E7E2DD] px-2 py-1 rounded-lg">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-jakarta text-sm text-[#74788C]">No results for "<span className="text-[#24283B] font-semibold">{query}</span>"</p>
            </div>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((i) => i.group === group);
              return (
                <div key={group}>
                  <p className="px-4 pt-3 pb-1 font-jakarta text-[10px] font-semibold uppercase tracking-[0.1em] text-[#74788C]">
                    {group}
                  </p>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const idx = flatIndex++;
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                          isActive ? 'bg-[#E6E9FF]' : 'hover:bg-[#FAF7F1]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-[#24283B] text-white' : 'bg-[#F6F0E5] text-[#74788C]'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-jakarta font-semibold text-[13px] text-[#24283B]">{item.label}</p>
                          {item.description && (
                            <p className="font-jakarta text-[11px] text-[#74788C] truncate">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.shortcut && (
                            <kbd className="font-jakarta text-[10px] text-[#74788C] bg-[#F6F0E5] border border-[#E7E2DD] px-1.5 py-0.5 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isActive && <ArrowRight size={14} className="text-[#74788C]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#E7E2DD] bg-[#FAF7F1]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-jakarta text-[10px] text-[#74788C]">
              <kbd className="bg-white border border-[#E7E2DD] px-1 py-0.5 rounded text-[9px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1 font-jakarta text-[10px] text-[#74788C]">
              <kbd className="bg-white border border-[#E7E2DD] px-1 py-0.5 rounded text-[9px]">↵</kbd> Select
            </span>
          </div>
          <span className="font-jakarta text-[10px] text-[#74788C]">{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}

