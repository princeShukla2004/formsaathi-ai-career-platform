import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ExternalLink, HelpCircle, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchVerifiedJobs,
  saveEligibilityCheckRecord,
} from '../../services/firestoreService';
import type { EligibilityEvaluation, EligibilityInput, JobListing } from '../../types';
import { calculateAgeFromDob, evaluateEligibility } from '../../utils/eligibilityEngine';

const INDIAN_STATES = [
  'All India', 'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export function EligibilityCheckerPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user, profile } = useAuth();

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(jobId || '');
  const [saveWithConsent, setSaveWithConsent] = useState(true);
  const [savedNotice, setSavedNotice] = useState('');
  const [evaluation, setEvaluation] = useState<EligibilityEvaluation | null>(null);

  const [form, setForm] = useState<EligibilityInput>({
    age: 23,
    dob: '',
    highestQualification: 'Bachelor Degree',
    degreeName: 'B.Tech / BCA',
    passingYear: '2025',
    percentageOrCgpa: '72',
    workExperienceYears: 0,
    nationality: 'Indian',
    state: 'Karnataka',
    category: 'General',
  });

  useEffect(() => {
    fetchVerifiedJobs().then((res) => {
      setJobs(res.jobs);
      if (jobId && res.jobs.some((j) => j.id === jobId)) {
        setSelectedJobId(jobId);
      } else if (!selectedJobId && res.jobs.length > 0) {
        setSelectedJobId(res.jobs[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        highestQualification: profile.qualification || prev.highestQualification,
        degreeName: profile.education || prev.degreeName,
        workExperienceYears:
          typeof profile.experience === 'number' ? profile.experience : prev.workExperienceYears,
      }));
    }
  }, [profile]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSavedNotice('');

    const computedAge = form.dob ? calculateAgeFromDob(form.dob) : form.age;
    const res = evaluateEligibility(
      { ...form, age: computedAge },
      selectedJob.eligibilityRules || { requiredQualifications: selectedJob.qualifications },
      selectedJob.officialSourceURL
    );
    setEvaluation(res);

    if (user && user.emailVerified && saveWithConsent) {
      try {
        await saveEligibilityCheckRecord(user.uid, {
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          result: res.result,
          matchedRequirements: res.matchedRequirements,
          unmatchedRequirements: res.unmatchedRequirements,
          missingInformation: res.missingInformation,
          sourceReference: res.sourceReference,
        });
        setSavedNotice('Eligibility result saved to your dashboard history.');
      } catch (err) {
        console.error('Failed to save eligibility check:', err);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">
          Smart Eligibility Checker
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1.5 max-w-3xl">
          Deterministic, rule-based eligibility comparison against published opportunity criteria. Aadhaar or PAN is never required.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <form
          onSubmit={handleEvaluate}
          className="lg:col-span-7 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div>
            <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
              Select Opportunity to Check Against
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setEvaluation(null);
              }}
              className="w-full px-3 py-2.5 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.organization} — {j.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Date of Birth (Optional if Age entered)
              </label>
              <input
                type="date"
                value={form.dob || ''}
                onChange={(e) => {
                  const dob = e.target.value;
                  const calc = calculateAgeFromDob(dob);
                  setForm({ ...form, dob, age: calc ?? form.age });
                }}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Age (Years)
              </label>
              <input
                type="number"
                min={15}
                max={65}
                value={form.age ?? ''}
                onChange={(e) =>
                  setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Highest Qualification
              </label>
              <select
                value={form.highestQualification}
                onChange={(e) => setForm({ ...form, highestQualification: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <option value="10th Pass">10th Pass</option>
                <option value="12th Pass">12th Pass</option>
                <option value="Diploma">Diploma</option>
                <option value="Bachelor Degree">Bachelor Degree / Graduate</option>
                <option value="B.Tech">B.Tech / B.E.</option>
                <option value="BCA">BCA / B.Sc</option>
                <option value="Master Degree">Master Degree / Post Graduate</option>
                <option value="MCA">MCA / M.Tech / MBA</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Degree / Stream Name
              </label>
              <input
                type="text"
                value={form.degreeName}
                onChange={(e) => setForm({ ...form, degreeName: e.target.value })}
                placeholder="e.g. B.Tech Computer Science"
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Passing Year
              </label>
              <input
                type="text"
                value={form.passingYear}
                onChange={(e) => setForm({ ...form, passingYear: e.target.value })}
                placeholder="2025"
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Percentage or CGPA
              </label>
              <input
                type="text"
                value={form.percentageOrCgpa}
                onChange={(e) => setForm({ ...form, percentageOrCgpa: e.target.value })}
                placeholder="e.g. 72 or 7.8"
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Work Experience (Years)
              </label>
              <input
                type="number"
                min={0}
                max={45}
                step="0.5"
                value={form.workExperienceYears ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    workExperienceYears: e.target.value !== '' ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Nationality
              </label>
              <input
                type="text"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                State / Location
              </label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200 mb-1.5">
                Reservation Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as EligibilityInput['category'] })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
              >
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="EWS">EWS</option>
                <option value="PwBD">PwBD</option>
              </select>
            </div>
          </div>

          {user && (
            <label className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveWithConsent}
                onChange={(e) => setSaveWithConsent(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Save this check to my Eligibility History (you can delete it anytime).</span>
            </label>
          )}

          <button
            type="submit"
            disabled={!selectedJob}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg transition-colors"
          >
            Calculate Eligibility
          </button>
        </form>

        {/* Results Column */}
        <div className="lg:col-span-5 space-y-5">
          {!evaluation ? (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-7 space-y-3">
              <ShieldCheck className="w-8 h-8 text-[#14B8A6]" />
              <h2 className="text-lg font-bold text-[#172033] dark:text-white">
                Transparent Rule Evaluation
              </h2>
              <p className="text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                Select an opportunity and fill in your academic and age details to see a deterministic rule-by-rule comparison.
              </p>
              {selectedJob && (
                <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 text-xs text-[#64748B] dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-[#172033] dark:text-slate-200">
                    Published Criteria for {selectedJob.organization}:
                  </p>
                  <p>Qualifications: {selectedJob.qualifications.join(', ')}</p>
                  <p>
                    Age: {selectedJob.eligibilityRules?.minAge ?? 18} –{' '}
                    {selectedJob.eligibilityRules?.maxAge ?? 'Open'} yrs
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0] dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  {evaluation.result === 'Eligible' && (
                    <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                  )}
                  {evaluation.result === 'Not Eligible' && (
                    <XCircle className="w-6 h-6 text-[#DC2626]" />
                  )}
                  {evaluation.result === 'Needs Verification' && (
                    <HelpCircle className="w-6 h-6 text-[#F59E0B]" />
                  )}
                  <div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400">Overall Status</p>
                    <h2 className="text-xl font-bold text-[#172033] dark:text-white">
                      {evaluation.result}
                    </h2>
                  </div>
                </div>
                {selectedJob && (
                  <Link
                    to={`/jobs/${selectedJob.id}`}
                    className="text-xs font-semibold text-[#0D9488] dark:text-teal-300 hover:underline"
                  >
                    Job Details
                  </Link>
                )}
              </div>

              {evaluation.matchedRequirements.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#16A34A] mb-2">
                    Requirements Matched
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#172033] dark:text-slate-200">
                    {evaluation.matchedRequirements.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.unmatchedRequirements.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#DC2626] mb-2">
                    Requirements Not Matched
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#172033] dark:text-slate-200">
                    {evaluation.unmatchedRequirements.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluation.missingInformation.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#F59E0B] mb-2">
                    Verification / Missing Information
                  </h3>
                  <ul className="space-y-1.5 text-sm text-[#172033] dark:text-slate-200">
                    {evaluation.missingInformation.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 space-y-2 text-xs text-[#64748B] dark:text-slate-400">
                {evaluation.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
                <a
                  href={evaluation.sourceReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#0D9488] dark:text-teal-300 hover:underline pt-1"
                >
                  <span>Verify against official source notification</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {savedNotice && (
                <p className="text-xs font-medium text-[#16A34A]">{savedNotice}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
