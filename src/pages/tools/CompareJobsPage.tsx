import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, GitCompare, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';
import {
  fetchJobComparisons,
  fetchVerifiedJobs,
  saveJobComparison,
} from '../../services/firestoreService';
import { computeJobMatch } from '../../utils/jobMatching';
import { evaluateJobSafetySignals } from '../../utils/scamDetector';
import { StatusBadge } from '../../components/ui/UIComponents';
import type { JobComparisonRecord, JobListing } from '../../types';

export function CompareJobsPage() {
  const { user, profile } = useAuth();
  const { compareJobs, addToCompare, removeFromCompare, clearCompare } = useCompare();

  const [catalog, setCatalog] = useState<JobListing[]>([]);
  const [savedSets, setSavedSets] = useState<JobComparisonRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchVerifiedJobs()
      .then((res) => setCatalog(res.jobs))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchJobComparisons(user.uid).then(setSavedSets).catch(() => {});
  }, [user]);

  const handleAddFromDropdown = () => {
    const found = catalog.find((j) => j.id === selectedJobId);
    if (found && !compareJobs.some((c) => c.id === found.id)) {
      addToCompare(found);
      setSelectedJobId('');
    }
  };

  const handleSaveComparison = async () => {
    if (!user || !user.emailVerified || compareJobs.length < 2) return;
    const title = compareJobs.map((j) => j.organization.split(' ')[0]).join(' vs ');
    await saveJobComparison(
      user.uid,
      title,
      compareJobs.map((j) => j.id)
    );
    const refreshed = await fetchJobComparisons(user.uid);
    setSavedSets(refreshed);
    setSaveMessage('Comparison snapshot saved to your account.');
  };

  const rows: Array<{
    label: string;
    render: (job: JobListing) => React.ReactNode;
  }> = [
    {
      label: 'Organization & Sector',
      render: (j) => (
        <div>
          <p className="font-semibold text-[#172033] dark:text-white">{j.organization}</p>
          <p className="text-xs text-[#64748B] dark:text-slate-400 capitalize">
            {j.sector} · {j.category}
          </p>
        </div>
      ),
    },
    {
      label: 'Salary / Stipend',
      render: (j) => <span className="font-semibold text-[#14243A] dark:text-teal-300">{j.salary}</span>,
    },
    {
      label: 'Required Qualifications',
      render: (j) => j.qualifications.join(', ') || 'See notification',
    },
    {
      label: 'Experience Required',
      render: (j) => j.experience,
    },
    {
      label: 'Age Limit Rules',
      render: (j) =>
        j.eligibilityRules?.minAge || j.eligibilityRules?.maxAge
          ? `${j.eligibilityRules.minAge ?? 18} – ${j.eligibilityRules.maxAge ?? 'No cap'} yrs`
          : 'Refer to portal notice',
    },
    {
      label: 'Location & Work Mode',
      render: (j) => `${j.location} (${j.workMode})`,
    },
    {
      label: 'Application Fee',
      render: (j) => j.applicationFee || 'Check portal',
    },
    {
      label: 'Closing Deadline',
      render: (j) => (
        <span className="font-mono-num">{j.importantDates?.lastDate || j.expiresAt || 'Ongoing'}</span>
      ),
    },
    {
      label: 'Safety Verification',
      render: (j) => {
        const safety = evaluateJobSafetySignals(j);
        return (
          <StatusBadge
            label={safety.statusLabel}
            tone={
              safety.riskLevel === 'low'
                ? 'verified'
                : safety.riskLevel === 'review'
                  ? 'warning'
                  : 'danger'
            }
          />
        );
      },
    },
    {
      label: 'Your Profile Match',
      render: (j) => {
        if (!user || !profile) return 'Sign in to score';
        const m = computeJobMatch(j, profile);
        return (
          <span className="font-mono-num font-bold text-[#0D9488] dark:text-teal-300">
            {m.score}% Match
          </span>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0D9488] dark:text-[#14B8A6]">
            Side-by-Side Decision Matrix
          </p>
          <h1 className="text-3xl font-bold text-[#14243A] dark:text-white mt-1">
            Compare Job Opportunities
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">
            Compare up to 3 jobs simultaneously across salary, eligibility rules, fees, deadlines, safety verification, and profile match.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user && user.emailVerified && compareJobs.length >= 2 && (
            <button
              type="button"
              onClick={handleSaveComparison}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Snapshot</span>
            </button>
          )}
          {compareJobs.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#DC2626]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Job Selector */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          aria-label="Select job to add to comparison"
          className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        >
          <option value="">Choose a verified job to add ({compareJobs.length}/3 selected)...</option>
          {catalog
            .filter((j) => !compareJobs.some((c) => c.id === j.id))
            .map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.organization} ({j.sector})
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={!selectedJobId || compareJobs.length >= 3}
          onClick={handleAddFromDropdown}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          <span>Add to Compare</span>
        </button>
      </div>

      {saveMessage && <p className="text-xs font-semibold text-[#16A34A]">{saveMessage}</p>}

      {compareJobs.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <GitCompare className="w-10 h-10 text-[#14B8A6] mx-auto" />
          <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
            No jobs selected for comparison yet
          </h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
            Select jobs using the dropdown above or click "+ Compare" on any job card across Explore Jobs.
          </p>
          <Link
            to="/jobs"
            className="inline-block px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1320]">
                <th className="p-4 font-bold text-[#64748B] dark:text-slate-400 w-48">Criteria</th>
                {compareJobs.map((job) => (
                  <th key={job.id} className="p-4 min-w-[230px] align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-sm font-bold text-[#14243A] dark:text-white hover:text-[#0D9488]"
                      >
                        {job.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFromCompare(job.id)}
                        className="text-[#64748B] hover:text-[#DC2626] shrink-0"
                        aria-label={`Remove ${job.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="p-4 font-semibold text-[#64748B] dark:text-slate-400 align-top">
                    {row.label}
                  </td>
                  {compareJobs.map((job) => (
                    <td key={`${row.label}_${job.id}`} className="p-4 text-[#172033] dark:text-slate-200 align-top">
                      {row.render(job)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-4 font-semibold text-[#64748B] dark:text-slate-400">Actions</td>
                {compareJobs.map((job) => (
                  <td key={`act_${job.id}`} className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/eligibility/${job.id}`}
                        className="px-2.5 py-1.5 font-semibold border border-[#14B8A6] text-[#0D9488] dark:text-teal-300 rounded-md"
                      >
                        Check Eligibility
                      </Link>
                      <a
                        href={job.applicationURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-md"
                      >
                        <span>Official Apply</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {user && savedSets.length > 0 && (
        <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-2">
          <h2 className="text-sm font-bold text-[#14243A] dark:text-white">
            Saved Comparison Snapshots ({savedSets.length})
          </h2>
          <ul className="text-xs text-[#64748B] dark:text-slate-400 space-y-1">
            {savedSets.slice(0, 5).map((s) => (
              <li key={s.id}>
                • <strong>{s.title}</strong> ({s.jobIds.length} jobs)
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
