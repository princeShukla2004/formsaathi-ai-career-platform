import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, PlusCircle, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  deleteJobAdmin,
  fetchAllJobsAdmin,
  verifyJobStatusAdmin,
} from '../../services/firestoreService';
import type { JobListing } from '../../types';

export function AdminJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = () => {
    setLoading(true);
    fetchAllJobsAdmin()
      .then(setJobs)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = jobs.filter((j) => {
    if (statusFilter !== 'all' && j.verificationStatus !== statusFilter) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.organization.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Job Management</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Manage all Firestore job opportunities, expiry statuses, and official sources.
          </p>
        </div>
        <Link
          to="/admin/jobs/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          <PlusCircle className="w-4 h-4" /> Add New Job
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search jobs..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        >
          <option value="all">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="h-44 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center text-sm text-[#64748B]">
          No job documents found in Firestore. Use &ldquo;Publish Starter Catalog&rdquo; on Admin Overview or add a new job.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E2E8F0] dark:border-slate-800 text-xs text-[#64748B]">
              <tr>
                <th className="py-3 px-4">Title &amp; Organization</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {filtered.map((j) => (
                <tr key={j.id}>
                  <td className="py-3 px-4">
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-xs text-[#64748B]">{j.organization}</p>
                  </td>
                  <td className="py-3 px-4 capitalize text-xs">{j.sector}</td>
                  <td className="py-3 px-4 text-xs font-medium capitalize">{j.verificationStatus}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        to={`/admin/jobs/${j.id}/edit`}
                        className="p-1.5 text-[#0D9488] hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded"
                        title="Edit job"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      {j.verificationStatus !== 'expired' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!user) return;
                            await verifyJobStatusAdmin(user.uid, user.email || '', j.id, 'expired');
                            load();
                          }}
                          className="text-xs text-[#F59E0B] hover:underline"
                        >
                          Mark Expired
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user) return;
                          await deleteJobAdmin(user.uid, user.email || '', j.id);
                          setJobs((p) => p.filter((x) => x.id !== j.id));
                        }}
                        className="p-1.5 text-[#DC2626]"
                        aria-label="Delete job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
