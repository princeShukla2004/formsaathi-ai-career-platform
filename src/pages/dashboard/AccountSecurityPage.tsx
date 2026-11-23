import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { deleteAllUserData, exportUserPersonalData } from '../../services/firestoreService';

export function AccountSecurityPage() {
  const { user, resendVerificationEmail, logout } = useAuth();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [busyDelete, setBusyDelete] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const payload = await exportUserPersonalData(user.uid);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formsaathi-export-${user.uid.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Your personal data export has been downloaded.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccountData = async () => {
    if (!user || confirmDelete !== 'DELETE') return;
    setBusyDelete(true);
    try {
      await deleteAllUserData(user.uid);
      await user.delete().catch(() => undefined);
      await logout();
      navigate('/');
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Re-authenticate recently to complete auth deletion; Firestore records were removed.'
      );
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Account Security &amp; Privacy</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Manage email verification, export your personal career records (DPDP right to access), or delete your account.
        </p>
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3 text-sm">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-5 h-5 text-[#14B8A6]" />
          <span>Authentication Status</span>
        </div>
        <p className="text-[#64748B] dark:text-slate-400">
          Email: <strong className="text-[#172033] dark:text-white">{user?.email}</strong>
        </p>
        <p className="text-[#64748B] dark:text-slate-400">
          Verification Status:{' '}
          <strong className={user?.emailVerified ? 'text-[#16A34A]' : 'text-[#F59E0B]'}>
            {user?.emailVerified ? 'Verified' : 'Pending Email Verification'}
          </strong>
        </p>
        {!user?.emailVerified && (
          <button
            type="button"
            onClick={async () => {
              await resendVerificationEmail();
              setMessage('Verification link sent to your email.');
            }}
            className="px-4 py-2 text-xs font-semibold bg-[#14243A] text-white rounded-lg"
          >
            Resend Verification Email
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
        <h2 className="text-base font-bold">Export Personal Data (JSON)</h2>
        <p className="text-xs text-[#64748B] dark:text-slate-400">
          Download a portable JSON archive of your profile, applications, resumes, eligibility history, checklists, and AI chats.
        </p>
        <button
          type="button"
          disabled={exporting}
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Preparing archive...' : 'Download Data Export'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-red-200 dark:border-red-900/50 rounded-xl p-6 space-y-3">
        <h2 className="text-base font-bold text-[#DC2626]">Delete Account &amp; Data</h2>
        <p className="text-xs text-[#64748B] dark:text-slate-400">
          Permanently removes your profile, saved jobs, applications, resumes, checklists, and chat history from Firestore. Type <strong>DELETE</strong> to confirm.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder="Type DELETE"
            className="px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
          <button
            type="button"
            disabled={confirmDelete !== 'DELETE' || busyDelete}
            onClick={handleDeleteAccountData}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#DC2626] rounded-lg disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            <span>{busyDelete ? 'Deleting...' : 'Permanently Delete Data'}</span>
          </button>
        </div>
      </div>

      {message && <p className="text-xs font-medium text-[#0D9488]">{message}</p>}
    </div>
  );
}
