import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Users,
  Flame,
  Link2,
  Sparkles,
  CheckCircle2,
  MapPin,
  Crosshair,
  Camera,
  Info,
} from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Incident, IncidentCategory, IncidentSeverity, SafetyRiskLevel, DisruptionLevel } from '../../types';
import { calculateTriageScore } from '../../utils/triageEngine';
import { CAMPUS_ASSETS_REGISTRY, getAssetsByBuilding, getAssetsByRoom } from '../../data/assetMappingData';

const CATEGORIES: IncidentCategory[] = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Structural',
  'IT / Network',
  'Safety',
  'Sanitation',
  'Pest Control',
  'Furniture & Fixtures',
  'Landscaping',
  'General',
];

const SEVERITIES: { value: IncidentSeverity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-[#D5F3E8] text-[#2E8B67]' },
  { value: 'medium', label: 'Medium', color: 'bg-[#FFE4CF] text-[#C06B33]' },
  { value: 'high', label: 'High', color: 'bg-[#F8DCE8] text-[#BA3D6E]' },
  { value: 'critical', label: 'Critical', color: 'bg-[#BA3D6E] text-white' },
];

const SAFETY_RISKS: { value: SafetyRiskLevel; label: string }[] = [
  { value: 'low', label: 'Low — No direct hazard' },
  { value: 'medium', label: 'Medium — Caution required' },
  { value: 'high', label: 'High — Immediate risk of injury' },
  { value: 'hazardous', label: 'Hazardous — Life safety threat' },
];

const DISRUPTIONS: { value: DisruptionLevel; label: string }[] = [
  { value: 'none', label: 'None — Normal operations' },
  { value: 'minor', label: 'Minor — Minor inconvenience' },
  { value: 'moderate', label: 'Moderate — Lab/Classroom restricted' },
  { value: 'severe', label: 'Severe — Critical facility shut down' },
];

const saveMarkedPhoto = (photo: string, marker: { x: number; y: number }) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('Could not prepare the marked photo.'));
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Photo marking is unavailable in this browser.'));
        return;
      }
      context.drawImage(image, 0, 0);
      const x = (marker.x / 100) * canvas.width;
      const y = (marker.y / 100) * canvas.height;
      const radius = Math.max(16, Math.min(canvas.width, canvas.height) * 0.045);
      context.strokeStyle = '#dc2626';
      context.lineWidth = Math.max(4, radius * 0.16);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(x - radius * 0.55, y);
      context.lineTo(x + radius * 0.55, y);
      context.moveTo(x, y - radius * 0.55);
      context.lineTo(x, y + radius * 0.55);
      context.stroke();
      const markedPhoto = canvas.toDataURL('image/jpeg', 0.62);
      if (markedPhoto.length > 1_300_000) {
        reject(new Error('Marked photo is too large.'));
        return;
      }
      resolve(markedPhoto);
    };
    image.src = photo;
  });

export default function ReportIncidentModal() {
  const { isReportIncidentOpen, setIsReportIncidentOpen, addIncident, user, buildings } = useCampus();

  const [form, setForm] = useState({
    title: '',
    category: 'General' as IncidentCategory,
    severity: 'medium' as IncidentSeverity,
    safetyRisk: 'low' as SafetyRiskLevel,
    disruptionLevel: 'none' as DisruptionLevel,
    peopleAffected: 1,
    buildingId: '',
    floor: '',
    room: '',
    assetId: '',
    assetName: '',
    description: '',
    evidenceUrlInput: '',
    evidenceUrls: [] as string[],
    reportedBy: user.name,
    reportedRole: user.role as string,
  });

  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoMarker, setPhotoMarker] = useState<{ x: number; y: number } | null>(null);
  const [markPhoto, setMarkPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [validationError, setValidationError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Available assets for the selected building & room
  const availableAssets = useMemo(() => {
    if (!form.buildingId) return [];
    if (form.room) {
      const roomAssets = getAssetsByRoom(form.buildingId, form.room);
      if (roomAssets.length > 0) return roomAssets;
    }
    return getAssetsByBuilding(form.buildingId);
  }, [form.buildingId, form.room]);

  const selectedAsset = useMemo(() => {
    return CAMPUS_ASSETS_REGISTRY.find((a) => a.id === selectedAssetId);
  }, [selectedAssetId]);

  // Derived location level: asset -> room -> floor -> building
  const mappedLocationLevel = useMemo<'building' | 'floor' | 'room' | 'asset'>(() => {
    if (selectedAsset) return 'asset';
    if (form.room.trim()) return 'room';
    if (form.floor.trim()) return 'floor';
    return 'building';
  }, [selectedAsset, form.room, form.floor]);

  // Live Triage Prediction calculation
  const liveTriage = useMemo(() => {
    return calculateTriageScore({
      category: form.category,
      severity: form.severity,
      safetyRisk: form.safetyRisk,
      disruptionLevel: form.disruptionLevel,
      peopleAffected: form.peopleAffected,
      buildingId: form.buildingId || 'main-block',
      room: form.room,
      title: form.title,
      description: form.description,
    });
  }, [
    form.category,
    form.severity,
    form.safetyRisk,
    form.disruptionLevel,
    form.peopleAffected,
    form.buildingId,
    form.room,
    form.title,
    form.description,
  ]);

  if (!isReportIncidentOpen) return null;

  const addEvidenceUrl = () => {
    const value = form.evidenceUrlInput.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported URL protocol');
    } catch {
      setValidationError('Evidence link must be a valid http or https URL.');
      return;
    }
    setValidationError('');
    setForm((prev) => ({ ...prev, evidenceUrls: [...prev.evidenceUrls, value], evidenceUrlInput: '' }));
  };

  const removeEvidenceUrl = (index: number) => {
    setForm((prev) => ({
      ...prev,
      evidenceUrls: prev.evidenceUrls.filter((_, i) => i !== index),
    }));
  };

  const handlePhotoCapture = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Choose an image file to attach.');
      return;
    }

    setPhotoError('');
    const reader = new FileReader();
    reader.onerror = () => setPhotoError('The photo could not be opened. Try another image.');
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => setPhotoError('The photo could not be opened. Try another image.');
      image.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          setPhotoError('Photo preview is unavailable in this browser.');
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.62);
        if (compressedPhoto.length > 1_300_000) {
          setPhotoError('This image is too large to attach. Choose a smaller photo.');
          return;
        }
        setCapturedPhoto(compressedPhoto);
        setPhotoMarker(null);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const placePhotoMarker = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!markPhoto) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPhotoMarker({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
    setMarkPhoto(false);
  };

  const handleAssetChange = (assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = CAMPUS_ASSETS_REGISTRY.find((a) => a.id === assetId);
    if (asset) {
      setForm((prev) => ({
        ...prev,
        assetId: asset.id,
        assetName: asset.name,
        buildingId: asset.buildingId,
        floor: asset.floor,
        room: asset.room,
        evidenceUrls: asset.photoUrl && !prev.evidenceUrls.includes(asset.photoUrl)
          ? [asset.photoUrl, ...prev.evidenceUrls]
          : prev.evidenceUrls,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        assetId: '',
        assetName: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    if (title.length < 5) {
      setValidationError('Enter an incident title with at least 5 characters.');
      return;
    }
    if (title.length > 150) {
      setValidationError('Incident titles must be 150 characters or fewer.');
      return;
    }
    if (description.length < 10) {
      setValidationError('Describe the issue in at least 10 characters.');
      return;
    }
    if (!form.buildingId) {
      setValidationError('Select the building where the issue occurred.');
      return;
    }
    if (form.peopleAffected < 1 || form.peopleAffected > 5000) {
      setValidationError('People affected must be between 1 and 5,000.');
      return;
    }
    setValidationError('');
    setSubmitting(true);
    const building = buildings.find((b) => b.id === form.buildingId);
    let evidencePhoto = capturedPhoto;
    if (capturedPhoto && photoMarker) {
      try {
        evidencePhoto = await saveMarkedPhoto(capturedPhoto, photoMarker);
      } catch {
        setPhotoError('The marked photo could not be prepared. Remove it or try again.');
        setSubmitting(false);
        return;
      }
    }

    const incidentResult = await addIncident({
        title: form.title,
        category: form.category,
        severity: form.severity,
        safetyRisk: form.safetyRisk,
        disruptionLevel: form.disruptionLevel,
        peopleAffected: Number(form.peopleAffected),
        buildingId: form.buildingId,
        buildingName: building?.name ?? form.buildingId,
        floor: form.floor || 'Ground Floor',
        room: form.room,
        description: form.description,
        evidenceUrls: evidencePhoto
          ? [...form.evidenceUrls, evidencePhoto]
          : form.evidenceUrls,
        annotationCoordinates: photoMarker
          ? { x: photoMarker.x, y: photoMarker.y }
          : selectedAsset?.annotationCoordinates,
        reportedBy: form.reportedBy,
        reportedRole: form.reportedRole,
        status: 'open',
        slaDeadline: `In ${liveTriage.resolutionTargetHours}h`,
        isDemo: true,
        assetId: selectedAsset?.id || form.assetId || undefined,
        assetName: selectedAsset?.name || form.assetName || undefined,
        assetCategory: selectedAsset?.category || undefined,
        mappedLocationLevel,
    });

    setSubmitting(false);
    if (!incidentResult.success) {
      setValidationError(incidentResult.message);
      return;
    }
    setIsReportIncidentOpen(false);
    setSelectedAssetId('');
    setCapturedPhoto(null);
    setPhotoMarker(null);
    setMarkPhoto(false);
    setForm({
        title: '',
        category: 'General',
        severity: 'medium',
        safetyRisk: 'low',
        disruptionLevel: 'none',
        peopleAffected: 1,
        buildingId: '',
        floor: '',
        room: '',
        assetId: '',
        assetName: '',
        description: '',
        evidenceUrlInput: '',
        evidenceUrls: [],
        reportedBy: user.name,
      reportedRole: user.role,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(36, 40, 59, 0.55)', backdropFilter: 'blur(8px)' }}
      onClick={() => setIsReportIncidentOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-[0_32px_64px_-8px_rgba(36,40,59,0.25)] border border-[#E7E2DD] overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="w-10 h-10 rounded-xl bg-[#F8DCE8] flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-[#BA3D6E]" />
          </div>
          <div className="flex-1">
            <h2 className="font-space font-bold text-lg text-[#24283B]">Report Campus Incident</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">
              Multi-factor intelligent triage & rapid dispatch logging
            </p>
          </div>
          <button
            onClick={() => setIsReportIncidentOpen(false)}
            className="p-2 rounded-xl text-[#74788C] hover:bg-[#F8DCE8] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {validationError && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-[#F1B9C8] bg-[#FDF0F6] px-3.5 py-2.5 font-jakarta text-xs font-medium text-[#8F2D54]">
              {validationError}
            </div>
          )}
          {/* Title */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Incident Title *
            </label>
            <input
              value={form.title}
              minLength={5}
              maxLength={150}
              onChange={(e) => { setValidationError(''); setForm({ ...form, title: e.target.value }); }}
              placeholder="e.g. Water leak in Mechanical Block lab ceiling near CNC Lathe #4"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] transition-all"
            />
          </div>

          {/* Category + Initial Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                Category (11 Disciplines) *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as IncidentCategory })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                Reporter Severity Rating *
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentSeverity })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-white"
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location: Building, Floor, Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                Building *
              </label>
              <select
                value={form.buildingId}
                onChange={(e) => {
                  const bId = e.target.value;
                  setForm({ ...form, buildingId: bId, room: '', floor: '' });
                  setSelectedAssetId('');
                }}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#6878CA] bg-white"
              >
                <option value="">Select building…</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">Floor</label>
              <input
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                placeholder="e.g. Floor 2 or Basement"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] transition-all"
              />
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                Room / Specific Zone
              </label>
              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Room 201 or Server Annex 401"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] transition-all"
              />
            </div>
          </div>

          {/* Specific Asset Selection & Exact Photo-Based Pinpoint Mapping */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair size={15} className="text-[#6878CA]" />
                <label className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                  Specific Mapped Asset (Optional)
                </label>
              </div>
              <span className="text-[10px] text-[#74788C]">
                {availableAssets.length} mapped assets in zone
              </span>
            </div>

            <select
              value={selectedAssetId}
              onChange={(e) => handleAssetChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
            >
              <option value="">Unlisted / General Room Equipment</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.room} · {asset.category})
                </option>
              ))}
            </select>

            {/* Mapped Asset Photo Preview with Pinpoint Annotation Coordinate */}
            {selectedAsset ? (
              <div className="mt-2 p-3 bg-white rounded-xl border border-[#D5DCFF] shadow-sm space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E9F9F2] text-[#2E8B67]">
                    <CheckCircle2 size={12} /> Exact Asset Mapped: {selectedAsset.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#74788C]">
                    Coords: ({selectedAsset.annotationCoordinates.x}%, {selectedAsset.annotationCoordinates.y}%)
                  </span>
                </div>

                {/* Photo Annotation Viewer */}
                <div className="relative rounded-lg overflow-hidden border border-[#E7E2DD] max-h-48 group">
                  <img
                    src={selectedAsset.photoUrl}
                    alt={selectedAsset.name}
                    className="w-full h-44 object-cover"
                  />
                  {/* Pinpoint Target Marker */}
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer pointer-events-none"
                    style={{
                      left: `${selectedAsset.annotationCoordinates.x}%`,
                      top: `${selectedAsset.annotationCoordinates.y}%`,
                    }}
                  >
                    <span className="w-6 h-6 rounded-full bg-red-500/30 animate-ping absolute" />
                    <span className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-md relative flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                    {selectedAsset.room} · S/N: {selectedAsset.serialNumber}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-[#E7E2DD] text-[11px] text-[#74788C]">
                <Info size={13} className="text-[#C06B33] flex-shrink-0" />
                <span>
                  Exact asset positioning unavailable. Issue will be mapped at the verified{' '}
                  <strong className="text-[#24283B] uppercase">{mappedLocationLevel}</strong> level in 3D Campus Digital Twin.
                </span>
              </div>
            )}
          </div>

          {/* Multi-factor Impact: Safety Risk, Disruption, People Affected */}
          <div className="p-4 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#BA3D6E]" />
              <h4 className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                Impact Assessment & Safety Triage
              </h4>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-jakarta text-[11px] font-semibold text-[#74788C] mb-1">
                  Safety Risk Level
                </label>
                <select
                  value={form.safetyRisk}
                  onChange={(e) => setForm({ ...form, safetyRisk: e.target.value as SafetyRiskLevel })}
                  className="w-full px-2.5 py-2 rounded-lg border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white"
                >
                  {SAFETY_RISKS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-jakarta text-[11px] font-semibold text-[#74788C] mb-1">
                  Operational Disruption
                </label>
                <select
                  value={form.disruptionLevel}
                  onChange={(e) => setForm({ ...form, disruptionLevel: e.target.value as DisruptionLevel })}
                  className="w-full px-2.5 py-2 rounded-lg border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white"
                >
                  {DISRUPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-jakarta text-[11px] font-semibold text-[#74788C] mb-1">
                  People Affected (Est.)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={form.peopleAffected}
                  onChange={(e) => setForm({ ...form, peopleAffected: Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)) })}
                  className="w-full px-2.5 py-2 rounded-lg border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Description & Observations *
            </label>
            <textarea
              value={form.description}
              minLength={10}
              maxLength={500}
              onChange={(e) => { setValidationError(''); setForm({ ...form, description: e.target.value }); }}
              placeholder="Describe the issue in detail — visible damage, smell/noise, equipment serials, safety hazard..."
              required
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] focus:ring-2 focus:ring-[#E6E9FF] transition-all resize-none"
            />
          </div>

          {/* Evidence Attachments */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Evidence Attachments (Optional)
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => handlePhotoCapture(event.target.files?.[0])}
              />
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handlePhotoCapture(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E6E9FF] text-[#4A5AA0] font-jakarta text-xs font-semibold hover:bg-[#D5DCFF] transition-colors"
              >
                <Camera size={14} /> Take a photo
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] text-[#24283B] font-jakarta text-xs font-semibold hover:bg-[#FAF7F1] transition-colors"
              >
                Choose image
              </button>
              <span className="font-jakarta text-[11px] text-[#74788C]">You can submit without a photo.</span>
            </div>
            {photoError && <p role="alert" className="mb-2 text-xs text-red-700">{photoError}</p>}
            {capturedPhoto && (
              <div className="mb-3 rounded-xl border border-[#E7E2DD] p-2.5 bg-[#FAF7F1]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-jakarta text-xs font-semibold text-[#24283B]">Incident photo preview</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMarkPhoto((current) => !current)}
                      className={`px-2.5 py-1.5 rounded-lg font-jakarta text-[11px] font-semibold ${markPhoto ? 'bg-red-600 text-white' : 'bg-white border border-[#E7E2DD] text-[#24283B]'}`}
                    >
                      {markPhoto ? 'Tap photo to mark' : 'Mark affected area'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCapturedPhoto(null); setPhotoMarker(null); setMarkPhoto(false); }}
                      className="text-xs font-semibold text-[#BA3D6E]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div
                  className={`relative max-h-64 overflow-hidden rounded-lg bg-white ${markPhoto ? 'cursor-crosshair' : ''}`}
                  onClick={placePhotoMarker}
                >
                  <img src={capturedPhoto} alt="Captured incident evidence" className="max-h-64 w-full object-contain" />
                  {photoMarker && (
                    <span
                      aria-label="Marked affected area"
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-[3px] border-red-600 bg-red-500/20 shadow-md pointer-events-none"
                      style={{ left: `${photoMarker.x}%`, top: `${photoMarker.y}%` }}
                    />
                  )}
                </div>
                {photoMarker && <p className="mt-1.5 text-[11px] text-[#74788C]">Marked area will be saved on the attached photo.</p>}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={form.evidenceUrlInput}
                onChange={(e) => setForm({ ...form, evidenceUrlInput: e.target.value })}
                placeholder="https://images.unsplash.com/... or cloud storage URL"
                className="flex-1 px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] placeholder:text-[#74788C]"
              />
              <button
                type="button"
                onClick={addEvidenceUrl}
                className="px-3 py-2 rounded-xl bg-[#F6F0E5] text-[#24283B] font-jakarta text-xs font-semibold hover:bg-[#E7E2DD] transition-colors"
              >
                + Add Link
              </button>
            </div>
            {form.evidenceUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.evidenceUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E6E9FF] text-[#4A5AA0] text-[11px] font-jakarta"
                  >
                    <Link2 size={12} />
                    <span className="truncate max-w-[200px]">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeEvidenceUrl(idx)}
                      className="ml-1 text-[#BA3D6E] font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Intelligent Triage Preview */}
          <div className="p-4 rounded-xl bg-[#F2F4FF] border border-[#E6E9FF] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E6E9FF] flex items-center justify-center font-space font-bold text-sm text-[#4A5AA0]">
                {liveTriage.score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-space font-bold text-xs uppercase tracking-wider text-[#24283B]">
                    Calculated Triage Priority:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold uppercase ${liveTriage.priority === 'critical'
                      ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                      : liveTriage.priority === 'high'
                        ? 'bg-[#FFE4CF] text-[#C06B33]'
                        : liveTriage.priority === 'medium'
                          ? 'bg-[#E6E9FF] text-[#6878CA]'
                          : 'bg-[#D5F3E8] text-[#2E8B67]'
                      }`}
                  >
                    {liveTriage.priority}
                  </span>
                </div>
                <p className="font-jakarta text-[11px] text-[#74788C] mt-0.5">
                  SLA Target: Acknowledgment within{' '}
                  {liveTriage.ackTargetMinutes < 60
                    ? `${liveTriage.ackTargetMinutes}m`
                    : `${Math.round(liveTriage.ackTargetMinutes / 60)}h`}{' '}
                  · Resolution in {liveTriage.resolutionTargetHours}h
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 font-jakarta text-[10px] font-bold text-[#6878CA] bg-white px-2.5 py-1 rounded-full border border-[#E6E9FF]">
                <Sparkles size={11} /> Multi-factor Engine
              </span>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E7E2DD] bg-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsReportIncidentOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-sm text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !form.title || !form.buildingId || !form.description}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#24283B] font-jakarta font-semibold text-sm text-white hover:bg-[#383E58] disabled:opacity-50 transition-all shadow-pastel-sm"
          >
            <CheckCircle2 size={16} />
            {submitting ? 'Submitting & Triaging…' : 'Submit & Triage Incident'}
          </button>
        </div>
      </div>
    </div>
  );
}
