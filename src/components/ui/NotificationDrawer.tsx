import React from 'react';
import { X, Bell, CheckCheck } from 'lucide-react';
import { useCampus, NotificationItem } from '../../context/CampusContext';

const TYPE_STYLES: Record<NotificationItem['type'], { border: string; dot: string; bg: string }> = {
  critical: { border: 'border-l-[#BA3D6E]', dot: 'bg-[#BA3D6E]', bg: 'bg-[#FDF0F6]' },
  alert: { border: 'border-l-[#C06B33]', dot: 'bg-[#C06B33]', bg: 'bg-[#FFF2E7]' },
  success: { border: 'border-l-[#2E8B67]', dot: 'bg-[#2E8B67]', bg: 'bg-[#E9F9F2]' },
  info: { border: 'border-l-[#6878CA]', dot: 'bg-[#6878CA]', bg: 'bg-[#F2F4FF]' },
};

export default function NotificationDrawer() {
  const {
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    unreadNotificationCount,
  } = useCampus();

  return (
    <>
      {/* Backdrop */}
      {isNotificationDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#24283B]/20"
          onClick={() => setIsNotificationDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white z-50 flex flex-col shadow-[-24px_0_48px_-8px_rgba(36,40,59,0.14)] transition-transform duration-300 ease-in-out border-l border-[#E7E2DD]"
        style={{ transform: isNotificationDrawerOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E2DD]">
          <div className="flex items-center gap-2.5">
            <Bell size={18} className="text-[#24283B]" />
            <h2 className="font-space font-bold text-base text-[#24283B]">Notifications</h2>
            {unreadNotificationCount > 0 && (
              <span className="px-2 py-0.5 bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-[11px] font-bold rounded-full">
                {unreadNotificationCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-jakarta text-[12px] text-[#74788C] hover:bg-[#F6F0E5] hover:text-[#24283B] transition-colors"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setIsNotificationDrawerOpen(false)}
              className="p-2 rounded-xl text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Bell size={32} className="text-[#D8D1C8] mb-3" />
              <p className="font-jakarta text-sm text-[#74788C]">All caught up! No notifications.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const s = TYPE_STYLES[notif.type];
              return (
                <button
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={`w-full text-left flex gap-3 px-4 py-3.5 rounded-xl border-l-4 transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(36,40,59,0.06)] ${s.border} ${notif.isRead ? 'bg-[#FAF7F1] opacity-70' : s.bg}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <span className={`block w-2 h-2 rounded-full ${notif.isRead ? 'bg-[#D8D1C8]' : s.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-jakarta font-semibold text-[13px] text-[#24283B] ${notif.isRead ? 'font-normal' : ''}`}>
                      {notif.title}
                    </p>
                    <p className="font-jakarta text-[12px] text-[#74788C] mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="font-jakarta text-[11px] text-[#9CA1B4] mt-1.5">{notif.timeAgo}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

