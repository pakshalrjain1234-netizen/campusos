import React, { useState, useMemo } from 'react';
import { X, Sparkles, MapPin, Users, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle, Info, Calendar } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { RoomRecommendation } from '../../types';

export default function ReallocateBookingModal() {
  const {
    isReallocateModalOpen,
    setIsReallocateModalOpen,
    selectedBookingForReallocation,
    recommendAlternativeRooms,
    reallocateBooking,
  } = useCampus();

  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState<string>('');
  const [reallocationReason, setReallocationReason] = useState<string>('Emergency facility reallocation due to active room disruption');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const booking = selectedBookingForReallocation;

  // Run transparent recommendation engine
  const recommendations: RoomRecommendation[] = useMemo(() => {
    if (!booking) return [];
    return recommendAlternativeRooms(booking);
  }, [booking, recommendAlternativeRooms]);

  // Pre-select top candidate
  React.useEffect(() => {
    if (recommendations.length > 0 && !selectedTargetRoomId) {
      setSelectedTargetRoomId(recommendations[0].room.id);
    }
  }, [recommendations, selectedTargetRoomId]);

  if (!isReallocateModalOpen || !booking) return null;

  const chosenRecommendation = recommendations.find((r) => r.room.id === selectedTargetRoomId);

  const handleConfirmReallocation = () => {
    if (!selectedTargetRoomId) return;
    setIsSubmitting(true);
    const res = reallocateBooking(booking.id, selectedTargetRoomId, reallocationReason);
    setIsSubmitting(false);
    if (res.success) {
      setIsReallocateModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24283B]/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E7E2DD] shadow-pastel-lg w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7E2DD] bg-[#F2F4FF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E6E9FF] border border-[#CAD2FC] flex items-center justify-center text-[#6878CA]">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-space font-bold text-lg text-[#24283B]">
                Intelligent Alternative Room Reallocation
              </h2>
              <p className="font-jakarta text-xs text-[#74788C]">
                Rule-based matching evaluated by capacity, required equipment, proximity, and timetable availability
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReallocateModalOpen(false)}
            className="p-2 rounded-xl text-[#74788C] hover:bg-[#E7E2DD] hover:text-[#24283B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Affected Booking Summary */}
          <div className="p-4 rounded-2xl bg-[#FFF2E7] border border-[#C06B33]/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FDF0F6] text-[#BA3D6E] font-jakarta text-[10px] font-bold border border-[#F1B9D2]">
                  Affected Session
                </span>
                <h3 className="font-space font-bold text-base text-[#24283B] mt-1">{booking.purpose}</h3>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs font-jakarta text-[#74788C]">
                  <span><strong>ID:</strong> {booking.bookingNumber}</span>
                  <span>·</span>
                  <span><strong>Disrupted Venue:</strong> {booking.roomName}</span>
                  <span>·</span>
                  <span><Users size={12} className="inline mr-1 text-[#C06B33]" />{booking.expectedAttendance} attendees</span>
                  <span>·</span>
                  <span><Calendar size={12} className="inline mr-1 text-[#6878CA]" />{booking.date} ({booking.startTime} - {booking.endTime})</span>
                </div>
              </div>
            </div>

            {booking.requiredEquipment && booking.requiredEquipment.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[#C06B33]/20 flex items-center gap-2 flex-wrap text-[11px] font-jakarta">
                <span className="font-semibold text-[#24283B]">Required Equipment:</span>
                {booking.requiredEquipment.map((eq) => (
                  <span
                    key={eq}
                    className="px-2 py-0.5 rounded-lg bg-white border border-[#E7E2DD] text-[#6878CA] font-semibold"
                  >
                    {eq}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI / Rule-Based Recommendations List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-space font-bold text-sm text-[#24283B] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#6878CA]" /> Ranked Alternative Spaces
              </h4>
              <span className="font-jakarta text-[11px] text-[#74788C]">
                {recommendations.length} suitable candidate spaces verified
              </span>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] text-center space-y-2">
                <AlertCircle size={24} className="mx-auto text-[#C06B33]" />
                <p className="font-space font-bold text-sm text-[#24283B]">No Alternative Rooms Available</p>
                <p className="font-jakarta text-xs text-[#74788C] max-w-md mx-auto">
                  No rooms meet the minimum required capacity of {booking.expectedAttendance} seats without a conflicting schedule during {booking.startTime} - {booking.endTime}. Consider splitting into multiple cohorts or adjusting the session time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => {
                  const isSelected = selectedTargetRoomId === rec.room.id;
                  return (
                    <div
                      key={rec.room.id}
                      onClick={() => setSelectedTargetRoomId(rec.room.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#F2F4FF] border-[#6878CA] shadow-pastel-sm ring-1 ring-[#6878CA]'
                          : 'bg-white border-[#E7E2DD] hover:bg-[#FAF7F1]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {index === 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-[#E9F9F2] text-[#2E8B67] font-jakarta text-[10px] font-bold border border-[#C5EFE0]">
                                Top Recommendation
                              </span>
                            )}
                            <span className="font-space font-bold text-sm text-[#24283B]">
                              {rec.room.roomNumber} - {rec.room.name}
                            </span>
                            <span className="text-[11px] font-jakarta text-[#74788C]">
                              ({rec.room.buildingName}, {rec.room.floor})
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-jakarta text-[#74788C]">
                            <span>
                              <strong>Capacity:</strong> {rec.room.capacity} seats (Fits {booking.expectedAttendance} pax)
                            </span>
                            <span>·</span>
                            <span>
                              <strong>Type:</strong> {rec.room.roomType.replace('_', ' ')}
                            </span>
                            {rec.room.isAccessible && (
                              <>
                                <span>·</span>
                                <span className="text-[#2E8B67] font-semibold">Accessible</span>
                              </>
                            )}
                          </div>

                          {/* Match reasons pills */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {rec.matchReasons.map((reason, rIdx) => (
                              <span
                                key={rIdx}
                                className="px-2 py-0.5 rounded-lg bg-white border border-[#E7E2DD] text-[10px] font-jakarta text-[#24283B]"
                              >
                                ✓ {reason}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full font-space font-bold text-xs ${
                              rec.score >= 150
                                ? 'bg-[#E9F9F2] text-[#2E8B67]'
                                : rec.score >= 120
                                ? 'bg-[#E6E9FF] text-[#6878CA]'
                                : 'bg-[#FFF2E7] text-[#C06B33]'
                            }`}
                          >
                            {rec.score}% Match
                          </span>
                          <span className="text-[10px] font-jakarta text-[#74788C]">Rule Verified</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reallocation Reason */}
          <div>
            <label className="block font-jakarta text-xs font-bold text-[#24283B] mb-1.5 flex items-center gap-1.5">
              <Info size={13} className="text-[#6878CA]" /> Authorization & Reallocation Reason
            </label>
            <input
              type="text"
              value={reallocationReason}
              onChange={(e) => setReallocationReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#6878CA]"
            />
          </div>

          {/* Reallocation Preview Box */}
          {chosenRecommendation && (
            <div className="p-3.5 rounded-2xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between text-xs font-jakarta">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#BA3D6E] line-through">{booking.roomName}</span>
                <ArrowRight size={14} className="text-[#74788C]" />
                <span className="font-bold text-[#2E8B67]">{chosenRecommendation.room.name}</span>
              </div>
              <span className="text-[#74788C]">
                {booking.date} · {booking.startTime} - {booking.endTime}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E2DD] bg-[#FAF7F1]">
          <button
            type="button"
            onClick={() => setIsReallocateModalOpen(false)}
            className="px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-xs text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTargetRoomId || isSubmitting}
            onClick={handleConfirmReallocation}
            className="px-5 py-2.5 rounded-xl bg-[#2E8B67] text-white font-jakarta font-semibold text-xs hover:bg-[#257355] disabled:opacity-50 transition-all shadow-pastel-sm flex items-center gap-2"
          >
            <CheckCircle2 size={14} />
            Authorize & Execute Reallocation
          </button>
        </div>
      </div>
    </div>
  );
}
