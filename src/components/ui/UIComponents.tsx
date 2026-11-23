import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, X } from 'lucide-react';

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  to,
  loading,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
  loading?: boolean;
}) {
  const inner = (
    <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#14B8A6]/70 rounded-xl p-4 sm:p-5 transition-colors h-full">
      <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400 mb-2">
        <span className="text-xs font-medium truncate">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[#0D9488] dark:text-[#14B8A6] shrink-0" />}
      </div>
      <p className="text-2xl font-bold font-mono-num text-[#14243A] dark:text-white tabular-nums">
        {loading ? '—' : value}
      </p>
      {sublabel && (
        <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 truncate">{sublabel}</p>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'verified' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  const styles: Record<typeof tone, string> = {
    verified: 'text-[#16A34A] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    warning: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
    danger: 'text-[#DC2626] dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60',
    info: 'text-[#0D9488] dark:text-teal-300 bg-[#CCFBF1]/50 dark:bg-teal-950/40 border-[#14B8A6]/40 dark:border-teal-800/60',
    neutral: 'text-[#64748B] dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 border-[#E2E8F0] dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  maxWidth = 'max-w-xl',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
          <h2 id="modal-dialog-title" className="text-base font-bold text-[#14243A] dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalDialog open={open} title={title} onClose={onCancel} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          {destructive && <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />}
          <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white ${
              destructive
                ? 'bg-[#DC2626] hover:bg-red-700'
                : 'bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Previous</span>
      </button>
      <span className="px-3 text-xs font-mono-num text-[#64748B] dark:text-slate-400">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <span>Next</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
      <Icon className="w-8 h-8 text-[#64748B] dark:text-slate-400 mx-auto" />
      <h2 className="text-base font-bold text-[#172033] dark:text-white">{title}</h2>
      <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-block mt-2 px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button
          type="button"
          onClick={onAction}
          className="inline-block mt-2 px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-28 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}
