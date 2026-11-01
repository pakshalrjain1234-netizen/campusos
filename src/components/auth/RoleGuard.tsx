import React from 'react';
import { AppRole, Permission } from '../../types/auth';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, ROLE_LABELS, normalizeRole } from '../../utils/permissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoleGuardProps {
  allowedRoles?: AppRole[];
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({
  allowedRoles,
  requiredPermission,
  fallback,
  children,
}: RoleGuardProps) {
  const { role } = useAuth();
  const navigate = useNavigate();

  const normRole = normalizeRole(role);
  const isRoleAllowed = allowedRoles
    ? allowedRoles.includes(role) || allowedRoles.includes(normRole)
    : true;
  const isPermissionAllowed = requiredPermission
    ? hasPermission(role, requiredPermission) || hasPermission(normRole, requiredPermission)
    : true;

  if (!isRoleAllowed || !isPermissionAllowed) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="p-8 max-w-xl mx-auto my-12 rounded-3xl bg-white border border-[#E7E2DD] shadow-[0_12px_32px_rgba(36,40,59,0.08)] text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FDF0F6] border border-[#F8DCE8] flex items-center justify-center text-[#BA3D6E]">
          <ShieldAlert size={28} />
        </div>
        <h2 className="font-space font-bold text-xl text-[#24283B]">Access Restricted</h2>
        <p className="font-jakarta text-sm text-[#74788C] mt-2 leading-relaxed">
          Your current account profile (<span className="font-semibold text-[#24283B]">{ROLE_LABELS[role]}</span>) does not hold the necessary operational permissions to access this module.
        </p>

        {allowedRoles && allowedRoles.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta text-[#74788C]">
            <span>Required Role(s): </span>
            <span className="font-bold text-[#24283B]">
              {allowedRoles.map((r) => ROLE_LABELS[r]).join(', ')}
            </span>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E6E9FF] text-[#4A5AA0] font-jakarta text-xs font-bold hover:bg-[#D4DAFF] transition"
          >
            <ArrowLeft size={14} /> Return to Overview
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

