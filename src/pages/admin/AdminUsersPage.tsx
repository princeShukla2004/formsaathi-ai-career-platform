import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAllUsersAdmin, toggleUserStatusAdmin } from '../../services/firestoreService';
import type { UserProfile } from '../../types';

export function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAllUsersAdmin()
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">User Management</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Review registered accounts and manage suspension state. Private resumes and documents remain owner-isolated.
        </p>
      </div>

      {loading ? (
        <div className="h-44 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] dark:border-slate-800 text-xs text-[#64748B]">
              <tr>
                <th className="py-3 px-4">Name &amp; Email</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.uid}>
                  <td className="py-3 px-4">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-[#64748B]">{u.email}</p>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono-num text-[#64748B]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium capitalize">{u.status}</td>
                  <td className="py-3 px-4">
                    {u.uid !== user?.uid && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user) return;
                          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                          await toggleUserStatusAdmin(user.uid, user.email || '', u.uid, nextStatus);
                          load();
                        }}
                        className="text-xs font-semibold text-[#0D9488] hover:underline"
                      >
                        {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
