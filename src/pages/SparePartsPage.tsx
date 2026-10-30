import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Zap, Database, GitBranch } from 'lucide-react';

export default function SparePartsPage() {
  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Spare-Part Finder</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Instantly locate parts across all campus storage locations</p>
      </div>

      {/* Search UI preview */}
      <div className="p-6 bg-white rounded-card-lg border border-[#E7E2DD] shadow-pastel-sm">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#E6E9FF] bg-[#F2F4FF]">
          <Search size={18} className="text-[#6878CA]" />
          <span className="font-jakarta text-[14px] text-[#9CA1B4]">Search by part name, SKU, specification, or application…</span>
        </div>
        <p className="font-jakarta text-[12px] text-[#74788C] mt-3 text-center">
          Full part search, cross-reference, and checkout will be available in Phase 2
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Smart Search Engine', desc: 'Natural language queries like "HVAC actuator for IT Block" resolve to exact SKU matches across all stores.', icon: Zap, bg: '#FFF2E7', color: '#C06B33' },
          { title: 'Multi-Store Mapping', desc: 'Instantly see which storage depot, workshop, or external vendor holds the part you need.', icon: Database, bg: '#F2F4FF', color: '#6878CA' },
          { title: 'Cross-Reference Trees', desc: 'Find compatible alternatives when primary parts are unavailable — with compatibility confidence scores.', icon: GitBranch, bg: '#E9F9F2', color: '#2E8B67' },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="p-5 rounded-card border border-[#E7E2DD]" style={{ background: f.bg }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: f.color + '20' }}>
                <Icon size={18} style={{ color: f.color }} />
              </div>
              <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">{f.title}</h3>
              <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

