import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, ZoomIn, Layers, Info } from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import CampusViewer3D from '../components/3d/CampusViewer3D';
import ThreejsErrorBoundary from '../components/3d/ThreejsErrorBoundary';

export default function Campus3DPage() {
  const { buildings } = useCampus();

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#E7E2DD] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm transition-colors">
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="w-px h-5 bg-[#E7E2DD]" />
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[#6878CA]" />
            <span className="font-space font-bold text-sm text-[#24283B]">3D Campus — MNMJEC</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#E6E9FF] text-[#6878CA] font-jakarta text-[11px] font-semibold">
            {buildings.length} Buildings Mapped
          </span>
          <span className="px-3 py-1 rounded-full bg-[#D5F3E8] text-[#2E8B67] font-jakarta text-[11px] font-semibold">
            Model: MNMJEC_Campus_Web.glb (v1)
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 relative" style={{ background: 'linear-gradient(160deg, #F2F4FF 0%, #E9DDFB 100%)' }}>
          <ThreejsErrorBoundary>
            <CampusViewer3D height="100%" />
          </ThreejsErrorBoundary>

          {/* Controls hint */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-[#E7E2DD]">
              <ZoomIn size={13} className="text-[#74788C]" />
              <span className="font-jakarta text-[11px] text-[#74788C]">Scroll to zoom</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-[#E7E2DD]">
              <Layers size={13} className="text-[#74788C]" />
              <span className="font-jakarta text-[11px] text-[#74788C]">Drag to orbit · Auto-rotating</span>
            </div>
          </div>

          {/* Coming soon overlay for click-to-select */}
          <div className="absolute top-4 right-4 px-4 py-3 rounded-xl bg-white/80 backdrop-blur-sm border border-[#E7E2DD] max-w-[220px]">
            <div className="flex items-center gap-2 mb-1">
              <Info size={13} className="text-[#6878CA]" />
              <span className="font-jakarta text-[11px] font-bold text-[#24283B]">Phase 2 Feature</span>
            </div>
            <p className="font-jakarta text-[11px] text-[#74788C] leading-relaxed">
              Click-to-select buildings, incident overlays, room status layers, and real-time asset pins coming in Phase 2.
            </p>
          </div>
        </div>

        {/* Building list sidebar */}
        <div className="w-72 bg-white border-l border-[#E7E2DD] flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-[#E7E2DD]">
            <p className="font-space font-bold text-[13px] text-[#24283B]">Campus Facilities</p>
            <p className="font-jakarta text-[11px] text-[#74788C]">Health status overview</p>
          </div>
          <div className="divide-y divide-[#F6F0E5]">
            {buildings.map((b) => {
              const health = b.healthScore;
              const color = health >= 93 ? '#2E8B67' : health >= 82 ? '#C06B33' : '#BA3D6E';
              return (
                <div key={b.id} className="px-4 py-3 hover:bg-[#FAF7F1] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="font-jakarta font-semibold text-[12px] text-[#24283B]">{b.shortName}</span>
                    </div>
                    <span className="font-space font-bold text-[12px]" style={{ color }}>{b.healthScore}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-jakarta text-[10px] text-[#74788C]">{b.openIncidents} incidents</span>
                    <span className="font-jakarta text-[10px] text-[#74788C]">{b.activeWorkOrders} work orders</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-1.5 h-1 rounded-full bg-[#F6F0E5] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.healthScore}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

