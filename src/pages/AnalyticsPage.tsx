import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const metrics = [
    { label: 'Avg Resolution Time', value: '4.2h', delta: '↓ 18% vs last month', good: true },
    { label: 'Preventive vs Reactive', value: '62 / 38%', delta: 'Target: 70 / 30%', good: false },
    { label: 'SLA Compliance', value: '91%', delta: '↑ from 87%', good: true },
    { label: 'Total Work Orders YTD', value: '1,204', delta: '+12% this quarter', good: true },
  ];
  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Analytics</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Operational performance reports and campus intelligence insights</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="p-5 bg-white rounded-card border border-[#E7E2DD] hover:shadow-pastel-sm transition-all">
            <p className="font-space font-bold text-2xl text-[#24283B]">{m.value}</p>
            <p className="font-jakarta text-[12px] font-semibold text-[#74788C] mt-1 uppercase tracking-wider">{m.label}</p>
            <p className={`font-jakarta text-[12px] mt-2 ${m.good ? 'text-[#2E8B67]' : 'text-[#C06B33]'}`}>{m.delta}</p>
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Incident Trend — Past 30 Days', icon: TrendingUp, bg: '#F2F4FF', color: '#6878CA' },
          { title: 'Building Health Distribution', icon: PieChart, bg: '#E9F9F2', color: '#2E8B67' },
          { title: 'Maintenance Category Breakdown', icon: BarChart3, bg: '#FFF2E7', color: '#C06B33' },
          { title: 'SLA Compliance Trend', icon: Activity, bg: '#E9DDFB', color: '#8964B8' },
        ].map((chart) => {
          const Icon = chart.icon;
          return (
            <div key={chart.title} className="p-6 rounded-card border border-[#E7E2DD] flex flex-col items-center justify-center gap-3 min-h-[180px]" style={{ background: chart.bg }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: chart.color + '20' }}>
                <Icon size={24} style={{ color: chart.color }} />
              </div>
              <p className="font-space font-bold text-[14px] text-[#24283B] text-center">{chart.title}</p>
              <span className="px-3 py-1 rounded-full bg-white/80 text-[#74788C] font-jakarta text-[11px] font-semibold">Chart integration in Phase 2</span>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-card bg-[#F2F4FF] border border-[#E6E9FF]">
        <p className="font-jakarta text-[12px] text-[#6878CA]">
          <strong>Phase 1 · Demo Mode:</strong> Full charting with Recharts/Chart.js, date-range filters, exportable reports, and Supabase-powered real data integration planned for Phase 2.
        </p>
      </div>
    </div>
  );
}

