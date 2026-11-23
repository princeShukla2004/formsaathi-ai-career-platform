import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, HelpCircle, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { deleteEligibilityCheckRecord, fetchEligibilityHistory } from '../../services/firestoreService';
import type { EligibilityCheckRecord } from '../../types';

export function EligibilityHistoryPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<EligibilityCheckRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchEligibilityHistory(user.uid)
      .then(setChecks)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">Eligibility History</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Saved rule-based eligibility evaluations from your account.
          </p>
        </div>
        <Link
          to="/eligibility"
          className="px-4 py-2 text-xs font-semibold bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          New Eligibility Check
        </Link>
      </div>

      {loading ? (
        <div className="h-40 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : checks.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-[#64748B]">No saved eligibility checks yet.</p>
          <Link to="/eligibility" className="text-xs font-semibold text-[#0D9488] underline">
            Run Smart Eligibility Checker
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {checks.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to={`/jobs/${c.jobId}`} className="text-base font-bold hover:text-[#0D9488]">
                    {c.jobTitle}
                  </Link>
                  <p className="text-xs font-mono-num text-[#64748B] mt-0.5">
                    Checked: {c.checkedAt ? new Date(c.checkedAt).toLocaleString() : 'Recently'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold">
                    {c.result === 'Eligible' && <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />}
                    {c.result === 'Not Eligible' && <XCircle className="w-4 h-4 text-[#DC2626]" />}
                    {c.result === 'Needs Verification' && <HelpCircle className="w-4 h-4 text-[#F59E0B]" />}
                    {c.result}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user) return;
                      await deleteEligibilityCheckRecord(user.uid, c.id);
                      setChecks((p) => p.filter((x) => x.id !== c.id));
                    }}
                    className="p-1 text-[#DC2626]"
                    aria-label="Delete check"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {c.matchedRequirements.length > 0 && (
                <p className="text-xs text-[#16A34A]">
                  Matched: {c.matchedRequirements.join(' · ')}
                </p>
              )}
              {c.unmatchedRequirements.length > 0 && (
                <p className="text-xs text-[#DC2626]">
                  Not matched: {c.unmatchedRequirements.join(' · ')}
                </p>
              )}
              {c.missingInformation.length > 0 && (
                <p className="text-xs text-[#F59E0B]">
                  Verify: {c.missingInformation.join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
