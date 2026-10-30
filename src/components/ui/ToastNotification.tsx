import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

const CONFIG = {
  success: { icon: CheckCircle2, bg: 'bg-[#D5F3E8]', border: 'border-[#2E8B67]/30', text: 'text-[#1B6648]' },
  info: { icon: Info, bg: 'bg-[#E6E9FF]', border: 'border-[#6878CA]/30', text: 'text-[#4A5AA0]' },
  error: { icon: AlertCircle, bg: 'bg-[#F8DCE8]', border: 'border-[#BA3D6E]/30', text: 'text-[#8A2252]' },
};

export default function ToastNotification() {
  const { toastMessage } = useCampus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [toastMessage]);

  if (!toastMessage) return null;

  const cfg = CONFIG[toastMessage.type];
  const Icon = cfg.icon;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-[0_12px_32px_-4px_rgba(36,40,59,0.16)] transition-all duration-400 ${cfg.bg} ${cfg.border} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ maxWidth: '360px', transitionProperty: 'opacity, transform' }}
    >
      <Icon size={18} className={`flex-shrink-0 ${cfg.text}`} />
      <p className={`font-jakarta font-medium text-[13px] ${cfg.text} flex-1`}>{toastMessage.text}</p>
    </div>
  );
}

