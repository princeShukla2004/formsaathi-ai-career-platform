import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, isAdmin, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1320]">
        <div className="space-y-3 w-72">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1320] px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-[#DC2626] mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#172033] dark:text-slate-100 mb-2">
            Administrator Access Required
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mb-6">
            This area is restricted to server-verified FormSaathi administrators. Your current account does not hold verified admin privileges.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#14243A] hover:bg-[#1D3557] rounded-lg"
          >
            Go to Candidate Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
