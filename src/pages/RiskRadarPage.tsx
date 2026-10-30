import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Radar, Brain, TrendingUp, ShieldAlert } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

export default function RiskRadarPage() {
  const { aiInsights } = useCampus();
  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Predictive Risk Radar</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">AI-powered anomaly detection and campus risk forecasting</p>
      </div>

      {/* Current AI insights */}
      <div>
        <h2 className="font-space font-bold text-base text-[#24283B] mb-3">Active Risk Signals</h2>
        <div className="space-y-3">
          {aiInsights.map((insight) => {
            const colors = {
              critical: { bg: '#FDF0F6', border: '#BA3D6E', text: '#BA3D6E' },
              warning: { bg: '#FFF2E7', border: '#C06B33', text: '#C06B33' },
              advisory: { bg: '#F2F4FF', border: '#6878CA', text: '#6878CA' },
            }[insight.severity];
            return (
              <div key={insight.id} className="p-5 bg-white rounded-card border-l-4 border-t border-r border-b border-[#E7E2DD]"
                style={{ borderLeftColor: colors.border }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: colors.bg, color: colors.text }}>
                        {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
                      </span>
                      <span className="font-jakarta text-[11px] text-[#74788C]">{insight.confidenceScore}% confidence · {insight.detectedTimeAgo}</span>
                    </div>
                    <h3 className="font-space font-bold text-[14px] text-[#24283B]">{insight.title}</h3>
                    <p className="font-jakarta text-[12px] text-[#74788C] mt-1">{insight.rootCause}</p>
                    <div className="mt-3 p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD]">
                      <p className="font-jakarta text-[11px] font-semibold text-[#74788C] mb-0.5">Recommended Action</p>
                      <p className="font-jakarta text-[12px] text-[#24283B]">{insight.recommendedAction}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'ML Failure Prediction', desc: 'Equipment telemetry analyzed by time-series models to forecast breakdowns 48–96 hours in advance.', icon: Brain, bg: '#E9DDFB', color: '#8964B8' },
          { title: 'Pattern Recognition', desc: 'Repeated complaint clustering and root cause attribution across systems, buildings, and time periods.', icon: TrendingUp, bg: '#F2F4FF', color: '#6878CA' },
          { title: 'Live Risk Heatmap', desc: '3D campus overlay showing risk zones, vulnerability scores, and active monitoring status per building.', icon: ShieldAlert, bg: '#FFF2E7', color: '#C06B33' },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="p-5 rounded-card border border-[#E7E2DD]" style={{ background: f.bg }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: f.color + '20' }}>
                <Icon size={18} style={{ color: f.color }} />
              </div>
              <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">{f.title}</h3>
              <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">{f.desc}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/80 text-[#74788C] font-jakarta text-[10px] font-semibold">Coming in Phase 2</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

