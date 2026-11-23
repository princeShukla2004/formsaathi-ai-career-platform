import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  fetchAIUsageLogsAdmin,
  fetchAllJobsAdmin,
  fetchAllUsersAdmin,
  fetchJobReportsAdmin,
} from '../../services/firestoreService';
import type { JobListing, JobReport, UserProfile } from '../../types';

export function AdminAnalyticsPage() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<JobReport[]>([]);
  const [aiLogs, setAiLogs] = useState<Array<{ id: string; feature: string; language: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAllJobsAdmin().catch(() => []),
      fetchAllUsersAdmin().catch(() => []),
      fetchJobReportsAdmin().catch(() => []),
      fetchAIUsageLogsAdmin().catch(() => []),
    ])
      .then(([j, u, r, ai]) => {
        setJobs(j);
        setUsers(u);
        setReports(r);
        setAiLogs(ai);
      })
      .finally(() => setLoading(false));
  }, []);

  const sectorCounts = {
    government: jobs.filter((j) => j.sector === 'government').length,
    private: jobs.filter((j) => j.sector === 'private').length,
    internship: jobs.filter((j) => j.sector === 'internship').length,
  };

  const verificationCounts = {
    verified: jobs.filter((j) => j.verificationStatus === 'verified').length,
    pending: jobs.filter((j) => j.verificationStatus === 'pending').length,
    rejected: jobs.filter((j) => j.verificationStatus === 'rejected').length,
    expired: jobs.filter((j) => j.verificationStatus === 'expired').length,
  };

  const langCounts = {
    en: users.filter((u) => u.preferredLanguage === 'en').length,
    hi: users.filter((u) => u.preferredLanguage === 'hi').length,
  };

  const maxSector = Math.max(1, sectorCounts.government, sectorCounts.private, sectorCounts.internship);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          Platform Analytics
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Live aggregate breakdowns computed strictly from stored Cloud Firestore records.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Stored Jobs</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : jobs.length}</p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Registered Candidates</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : users.length}</p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">Flagged Job Reports</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : reports.length}</p>
        </div>
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs text-[#64748B] dark:text-slate-400">AI Assist Events</p>
          <p className="text-2xl font-bold font-mono-num mt-1">{loading ? '—' : aiLogs.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#14B8A6]" /> Jobs by Sector
          </h2>
          <div className="space-y-3 text-xs">
            {[
              { label: 'Government Jobs', val: sectorCounts.government, color: 'bg-[#14243A] dark:bg-teal-400' },
              { label: 'Private Sector', val: sectorCounts.private, color: 'bg-[#14B8A6]' },
              { label: 'Internships', val: sectorCounts.internship, color: 'bg-sky-600' },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between">
                  <span>{row.label}</span>
                  <span className="font-mono-num font-semibold">{row.val}</span>
                </div>
                <div className="h-2.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${row.color}`}
                    style={{ width: `${Math.round((row.val / maxSector) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold">Verification &amp; Language Overview</h2>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
              <p className="text-[#64748B] dark:text-slate-400">Verified Listings</p>
              <p className="text-lg font-bold font-mono-num text-[#16A34A] mt-0.5">
                {verificationCounts.verified}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
              <p className="text-[#64748B] dark:text-slate-400">Pending Review</p>
              <p className="text-lg font-bold font-mono-num text-amber-600 mt-0.5">
                {verificationCounts.pending}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
              <p className="text-[#64748B] dark:text-slate-400">Expired / Rejected</p>
              <p className="text-lg font-bold font-mono-num mt-0.5">
                {verificationCounts.expired + verificationCounts.rejected}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-800">
              <p className="text-[#64748B] dark:text-slate-400">Candidate Locale Split</p>
              <p className="text-sm font-bold font-mono-num mt-1">
                EN {langCounts.en} · HI {langCounts.hi}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
