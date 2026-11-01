import React, { useState } from 'react';
import { Html } from '@react-three/drei';
import {
  AlertTriangle,
  Flame,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Eye,
  Crosshair,
  Building2,
  Clock,
  MapPin,
} from 'lucide-react';
import { Incident } from '../../types';

interface BuildingClusterBadgeProps {
  buildingCode: string;
  buildingName: string;
  position: [number, number, number];
  incidents: Incident[];
  onSelect: () => void;
  isSelected: boolean;
}

export const BuildingClusterBadge: React.FC<BuildingClusterBadgeProps> = ({
  buildingCode,
  buildingName,
  position,
  incidents,
  onSelect,
  isSelected,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Strictly filter out any resolved/closed incidents
  const activeCount = incidents.filter(
    (i) =>
      i.status !== 'resolved' &&
      i.status !== 'closed' &&
      i.lifecycleStatus !== 'resolved' &&
      i.lifecycleStatus !== 'closed'
  ).length;

  if (activeCount === 0) return null;

  const hasCritical = incidents.some((i) => i.severity === 'critical');
  const hasHigh = incidents.some((i) => i.severity === 'high');

  const theme = hasCritical
    ? {
        bg: 'bg-red-600',
        ring: 'ring-red-400',
        text: 'text-white',
        border: 'border-red-700',
        ping: true,
      }
    : hasHigh
    ? {
        bg: 'bg-amber-600',
        ring: 'ring-amber-300',
        text: 'text-white',
        border: 'border-amber-700',
        ping: true,
      }
    : {
        bg: 'bg-red-600',
        ring: 'ring-red-400',
        text: 'text-white',
        border: 'border-red-700',
        ping: true,
      };

  return (
    <Html position={position} center zIndexRange={[18, 0]}>
      <div
        className="relative flex flex-col items-center cursor-pointer select-none group"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Compact incident count; the separate campus label keeps each block identifiable. */}
        <div
          aria-label={`${buildingName || buildingCode}: ${activeCount} active incidents`}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full shadow-md border transition-colors ${
            theme.bg
          } ${theme.text} ${theme.border} ${
            isSelected ? 'ring-2 ring-white' : 'hover:brightness-95'
          }`}
          style={{ fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap' }}
        >
          <span className="inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-white">
          </span>
          <span className="font-jakarta font-bold">
            {activeCount} {activeCount === 1 ? 'issue' : 'issues'}
          </span>
        </div>

        {/* Stem down to building roof */}
        <div className={`w-0.5 h-3 ${theme.bg} opacity-90 shadow-sm`} />

        {/* Hover Tooltip Preview */}
        {isHovered && !isSelected && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-56 p-2.5 bg-slate-950/95 text-white rounded-xl shadow-2xl border border-slate-700 backdrop-blur-md pointer-events-none z-50 animate-in fade-in zoom-in-95">
            <p className="font-space font-bold text-xs text-red-300 truncate">{buildingName}</p>
            <p className="text-[10px] text-slate-300 mt-0.5 font-medium">
              {activeCount} active issue{activeCount > 1 ? 's' : ''} reported
            </p>
            <div className="mt-1.5 space-y-1">
              {incidents.slice(0, 3).map((inc) => (
                <div key={inc.id} className="text-[10px] text-slate-200 truncate flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      inc.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="truncate">{inc.ticketNumber}: {inc.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
};

interface IncidentPinMarkerProps {
  incident: Incident;
  position: [number, number, number];
  onSelect: (incidentId: string) => void;
  isSelected: boolean;
  targetRoom?: string | null;
}

export const IncidentPinMarker: React.FC<IncidentPinMarkerProps> = ({
  incident,
  position,
  onSelect,
  isSelected,
  targetRoom,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const isCritical = incident.severity === 'critical';
  const isHigh = incident.severity === 'high';
  const isMedium = incident.severity === 'medium';
  const isResolved =
    incident.status === 'resolved' ||
    incident.status === 'closed' ||
    incident.lifecycleStatus === 'resolved' ||
    incident.lifecycleStatus === 'closed';

  if (isResolved) return null;

  const theme = isCritical || isSelected
    ? {
        bg: 'bg-red-600 text-white border-red-700 shadow-red-500/50',
        dot: 'bg-red-500',
        ping: true,
      }
    : isHigh
    ? {
        bg: 'bg-amber-600 text-white border-amber-700',
        dot: 'bg-amber-500',
        ping: false,
      }
    : isMedium
    ? {
        bg: 'bg-yellow-500 text-slate-900 border-yellow-600',
        dot: 'bg-yellow-500',
        ping: false,
      }
    : {
        bg: 'bg-blue-600 text-white border-blue-700',
        dot: 'bg-blue-500',
        ping: false,
      };

  return (
    <Html position={position} center zIndexRange={[18, 0]}>
      <div
        className="relative flex flex-col items-center cursor-pointer select-none group"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(incident.id);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Strong pulsing ring for selected incident */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full shadow-md border transition-colors ${
            theme.bg
          } ${
            isSelected
              ? 'ring-2 ring-white z-30'
              : 'hover:brightness-105'
          }`}
          style={{ fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap' }}
        >
          {incident.assetName ? (
            <Crosshair className="w-3.5 h-3.5 flex-shrink-0 animate-spin-slow" />
          ) : isCritical || isSelected ? (
            <Flame className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-amber-200" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}

          <div className="flex flex-col text-left leading-tight">
            <span className="font-mono font-bold text-[10px] whitespace-nowrap">
              {incident.ticketNumber || incident.id.slice(-4)}
            </span>
            {targetRoom && isSelected && (
              <span className="text-[8px] font-bold text-amber-200 whitespace-nowrap">
                {targetRoom}
              </span>
            )}
          </div>
        </div>

        {/* Vertical Needle Pin */}
        <div className={`w-0.5 h-3.5 ${theme.dot} opacity-90 shadow-sm`} />

        {/* Hover Information Box */}
        {isHovered && !isSelected && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-52 p-2.5 bg-slate-950/95 text-white rounded-xl shadow-2xl border border-slate-700 backdrop-blur-md pointer-events-none z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-300">
                {incident.category}
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {incident.ticketNumber}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-100 line-clamp-2 leading-tight">
              {incident.title}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
              <span className="flex items-center gap-0.5 truncate">
                <MapPin size={9} /> {incident.room || incident.floor || 'Room location not available'}
              </span>
              <span className="capitalize font-semibold text-slate-300 ml-1 flex-shrink-0">
                {incident.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </Html>
  );
};
