import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Briefcase, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createApplicationRecord, unsaveJobForUser } from '../../services/firestoreService';

export function SavedJobsPage() {
  const { user, savedJobs } = useAuth();
  const navigate = useNavigate();

  const handleMoveToTracker = async (jobId: string, jobTitle: string, organization: string, deadline?: string) => {
    if (!user) return;
    await createApplicationRecord(user.uid, {
      jobId,
      jobTitle,
      organization,
      status: 'Planning to Apply',
      deadline: deadline || '',
    });
    navigate('/dashboard/applications');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Saved Jobs</h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Opportunities you bookmarked for review and eligibility verification.
        </p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <Bookmark className="w-8 h-8 text-[#64748B] mx-auto" />
          <h2 className="text-base font-semibold">No saved jobs yet</h2>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Click &ldquo;Save Job&rdquo; on any opportunity while browsing to store it here.
          </p>
          <Link
            to="/jobs"
            className="inline-block px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
          >
            Explore Opportunities
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedJobs.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <Link
                  to={`/jobs/${s.jobId}`}
                  className="text-base font-semibold text-[#172033] dark:text-slate-100 hover:text-[#0D9488]"
                >
                  {s.jobTitle}
                </Link>
                <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">{s.organization}</p>
                {s.deadline && (
                  <p className="text-xs font-mono-num text-[#64748B] dark:text-slate-400 mt-2">
                    Deadline: {s.deadline}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleMoveToTracker(s.jobId, s.jobTitle, s.organization, s.deadline)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Track Application</span>
                </button>
                <Link
                  to={`/eligibility/${s.jobId}`}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  Check Eligibility
                </Link>
                <button
                  type="button"
                  onClick={() => user && unsaveJobForUser(user.uid, s.jobId)}
                  className="ml-auto p-1.5 text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                  aria-label="Remove saved job"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
