import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchAllJobsAdmin, verifyJobStatusAdmin } from '../../services/firestoreService';
import type { JobListing } from '../../types';

export function AdminVerificationPage() {
  const { user } = useAuth();
  const [pendingJobs, setPendingJobs] = useState<JobListing[]>([]);
  const [checkedUrls, setCheckedUrls] = useState<Record<string, boolean>>({});
  const [checkedDetails, setCheckedDetails] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAllJobsAdmin()
      .then((all) => setPendingJobs(all.filter((j) => j.verificationStatus === 'pending')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Job Verification Queue</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Confirm the official source URL and published details before publishing a listing live.
        </p>
      </div>

      {loading ? (
        <div className="h-40 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : pendingJobs.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center text-sm text-[#64748B]">
          No pending job submissions waiting for review.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingJobs.map((job) => {
            const readyToApprove = Boolean(checkedUrls[job.id] && checkedDetails[job.id]);
            return (
              <div
                key={job.id}
                className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">{job.title}</h2>
                    <p className="text-sm text-[#64748B]">
                      {job.organization} · {job.sector} · {job.location}
                    </p>
                  </div>
                  <a
                    href={job.officialSourceURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488] underline"
                  >
                    <span>Inspect Official URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(checkedUrls[job.id])}
                      onChange={(e) =>
                        setCheckedUrls({ ...checkedUrls, [job.id]: e.target.checked })
                      }
                    />
                    <span>Official source URL ({job.officialSourceURL}) verified as genuine</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(checkedDetails[job.id])}
                      onChange={(e) =>
                        setCheckedDetails({ ...checkedDetails, [job.id]: e.target.checked })
                      }
                    />
                    <span>Dates, qualifications, and application instructions cross-checked</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={!readyToApprove}
                    onClick={async () => {
                      if (!user) return;
                      await verifyJobStatusAdmin(user.uid, user.email || '', job.id, 'verified');
                      load();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16A34A] rounded-lg disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve &amp; Publish
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) return;
                      await verifyJobStatusAdmin(user.uid, user.email || '', job.id, 'rejected');
                      load();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#DC2626] border border-red-200 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
