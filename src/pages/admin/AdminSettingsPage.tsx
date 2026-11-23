import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { Shield, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db, formatFirestoreDate } from '../../lib/firebase';
import { fetchAuditLogsAdmin, logAdminAction } from '../../services/firestoreService';
import type { AdminAuditLog } from '../../types';

interface AdminDocItem {
  uid: string;
  email: string;
  grantedBy?: string;
  createdAt?: string;
}

export function AdminSettingsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminDocItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUid, setNewUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminSnap, logs] = await Promise.all([
        getDocs(collection(db, 'admins')).catch(() => null),
        fetchAuditLogsAdmin().catch(() => []),
      ]);
      if (adminSnap) {
        setAdmins(
          adminSnap.docs.map((d) => ({
            uid: d.id,
            email: d.data().email || '',
            grantedBy: d.data().grantedBy || '',
            createdAt: formatFirestoreDate(d.data().createdAt),
          }))
        );
      }
      setAuditLogs(logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newUid.trim() || !newEmail.trim()) return;
    setSubmitting(true);
    setStatusMsg('');
    try {
      const cleanUid = newUid.trim();
      await setDoc(doc(db, 'admins', cleanUid), {
        uid: cleanUid,
        email: newEmail.trim(),
        grantedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      await logAdminAction(
        user.uid,
        user.email || '',
        'GRANT_ADMIN',
        cleanUid,
        `Added admin role for ${newEmail.trim()}`
      );
      setNewUid('');
      setNewEmail('');
      setStatusMsg(`Admin access granted to UID ${cleanUid}.`);
      loadData();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to add admin record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (uid: string) => {
    if (!user || uid === user.uid) return;
    try {
      await deleteDoc(doc(db, 'admins', uid));
      await logAdminAction(user.uid, user.email || '', 'REVOKE_ADMIN', uid, 'Revoked admin record');
      setStatusMsg(`Revoked admin role for UID ${uid}.`);
      loadData();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to revoke admin.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          Admin Settings &amp; Audit Logs
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Manage privileged `/admins` records and review immutable audit trails.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-[#CCFBF1]/40 dark:bg-teal-950/30 border border-[#14B8A6]/40 text-xs text-[#0F766E] dark:text-teal-300">
          {statusMsg}
        </div>
      )}

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Shield className="w-4 h-4 text-[#14B8A6]" /> Primary Bootstrapped Administrator
        </div>
        <p className="text-xs text-[#64748B] dark:text-slate-300">
          Verified email <span className="font-mono-num font-semibold">prince.nuv.bca@gmail.com</span> is configured as the initial platform administrator in Firestore Security Rules (`firestore.rules`). Additional administrators can be granted access below using their Firebase Auth UID.
        </p>

        <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <input
            type="text"
            required
            value={newUid}
            onChange={(e) => setNewUid(e.target.value)}
            placeholder="Firebase Auth UID"
            className="px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320] font-mono-num"
          />
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Admin Verified Email"
            className="px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? 'Granting...' : 'Grant Admin Role'}</span>
          </button>
        </form>

        {admins.length > 0 && (
          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              Delegated Admins ({admins.length})
            </h3>
            {admins.map((a) => (
              <div
                key={a.uid}
                className="flex items-center justify-between gap-3 py-2 text-xs border-b last:border-b-0 border-[#E2E8F0] dark:border-slate-800"
              >
                <div>
                  <span className="font-semibold">{a.email}</span>
                  <span className="ml-2 font-mono-num text-[#64748B]">UID: {a.uid}</span>
                </div>
                {a.uid !== user?.uid && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAdmin(a.uid)}
                    className="inline-flex items-center gap-1 text-red-600 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E2E8F0] dark:border-slate-800">
          <h2 className="text-sm font-bold">Immutable Admin Audit Logs (`/adminAuditLogs`)</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-[#64748B]">Loading audit logs...</div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B] dark:text-slate-400">
            No administrative mutations logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Target &amp; Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-mono-num text-[#64748B] dark:text-slate-400">
                      {log.createdAt || 'Just now'}
                    </td>
                    <td className="py-3 px-4 font-semibold">{log.action}</td>
                    <td className="py-3 px-4">{log.adminEmail || log.adminUid}</td>
                    <td className="py-3 px-4 text-[#64748B] dark:text-slate-300">
                      <span className="font-mono-num">{log.targetId}</span> · {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
