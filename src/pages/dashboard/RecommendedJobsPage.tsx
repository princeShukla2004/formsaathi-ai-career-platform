import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { JobCard } from '../../components/JobCard';
import { useAuth } from '../../context/AuthContext';
import { fetchVerifiedJobs } from '../../services/firestoreService';
import { computeJobMatch } from '../../utils/jobMatching';
import type { JobListing } from '../../types';

export function RecommendedJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifiedJobs()
      .then((res) => setJobs(res.jobs))
      .finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() => {
    return jobs
      .map((job) => ({ job, match: computeJobMatch(job, profile) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [jobs, profile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            Recommended Jobs &amp; Match Intelligence
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Ranked transparently across your qualification, skills, experience, work mode, and preferred locations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/job-alerts"
            className="text-xs font-semibold text-[#0D9488] hover:underline whitespace-nowrap"
          >
            Manage Job Alerts
          </Link>
          <Link
            to="/dashboard/profile"
            className="text-xs font-medium text-[#64748B] dark:text-slate-300 hover:underline whitespace-nowrap"
          >
            Update Career Profile
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-52 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            No verified jobs available right now. Check back soon or explore the full catalog.
          </p>
          <Link
            to="/jobs"
            className="inline-block px-4 py-2 text-xs font-semibold bg-[#14243A] text-white rounded-lg"
          >
            Browse All Jobs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ranked.map(({ job, match }) => (
            <JobCard key={job.id} job={job} matchResult={match} />
          ))}
        </div>
      )}
    </div>
  );
}
