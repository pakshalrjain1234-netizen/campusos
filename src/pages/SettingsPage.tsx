import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, User, Bell, Shield, Database, Palette } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

export default function SettingsPage() {
  const { user, setUserRole } = useCampus();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Integration', icon: Database },
  ];

  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Settings</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Configure CampusOps to match your operational needs</p>
      </div>

      <div className="flex gap-6">
        {/* Tab list */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-jakarta text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#E6E9FF] text-[#4A5AA0] font-semibold'
                    : 'text-[#74788C] hover:bg-[#F6F0E5] hover:text-[#24283B]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-card-lg border border-[#E7E2DD] p-6">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h2 className="font-space font-bold text-lg text-[#24283B]">Profile Settings</h2>
              <div className="flex items-center gap-4">
                <img src={user.avatar} alt={user.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E6E9FF]"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=E6E9FF&color=24283B&size=128'; }} />
                <div>
                  <p className="font-space font-bold text-base text-[#24283B]">{user.name}</p>
                  <p className="font-jakarta text-sm text-[#74788C]">{user.role}</p>
                  <p className="font-jakarta text-xs text-[#9CA1B4] mt-0.5">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', value: user.name },
                  { label: 'Email', value: user.email },
                  { label: 'Department', value: user.department },
                  { label: 'Role', value: user.role },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block font-jakarta text-[12px] font-semibold text-[#74788C] mb-1.5">{f.label}</label>
                    <div className="px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] font-jakarta text-sm text-[#24283B]">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-5">
              <h2 className="font-space font-bold text-lg text-[#24283B]">Data & Integration</h2>
              <div className="p-4 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1]">
                <p className="font-jakarta font-semibold text-sm text-[#24283B] mb-1">Supabase Integration</p>
                <p className="font-jakarta text-[12px] text-[#74788C]">Add your <code className="bg-[#E7E2DD] px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-[#E7E2DD] px-1 rounded">VITE_SUPABASE_ANON_KEY</code> environment variables to connect CampusOps to a live Supabase database.</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#C06B33]" />
                  <span className="font-jakarta text-[12px] text-[#C06B33] font-semibold">Not connected — running on demo data</span>
                </div>
              </div>
            </div>
          )}

          {(activeTab !== 'profile' && activeTab !== 'data') && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings size={32} className="text-[#D8D1C8] mb-3" />
              <p className="font-space font-bold text-base text-[#24283B]">{tabs.find(t => t.id === activeTab)?.label} Settings</p>
              <p className="font-jakarta text-sm text-[#74788C] mt-1">This settings section is being built for Phase 2.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

