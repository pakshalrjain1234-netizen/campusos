import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F0E5] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#EDE4F9] to-[#DFD0EF] text-[#6878CA] border border-white shadow-[0_8px_24px_rgba(104,120,202,0.2)] mb-4">
          <Zap size={26} className="text-[#6878CA] animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#BA3D6E] text-[8px] font-black text-white shadow-xs">
            3D
          </span>
        </div>
        <div className="w-8 h-8 border-2 border-[#6878CA] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="font-space font-bold text-base text-[#24283B] tracking-tight">CampusOps</p>
        <p className="font-jakarta text-xs text-[#74788C] mt-1">Authenticating operational credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

