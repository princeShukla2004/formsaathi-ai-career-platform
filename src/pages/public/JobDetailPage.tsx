import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Bot,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Flag,
  GitCompare,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';
import {
  createApplicationRecord,
  fetchJobById,
  saveDocumentChecklist,
  saveJobForUser,
  submitJobReport,
  unsaveJobForUser,
} from '../../services/firestoreService';
import { computeJobMatch } from '../../utils/jobMatching';
import { evaluateJobSafetySignals } from '../../utils/scamDetector';
import { StatusBadge } from '../../components/ui/UIComponents';
import type { JobListing } from '../../types';

const SCAM_WARNING_INDICATORS = [
  'Asks for upfront registration/security fee or private offer deposit',
  'Links to a suspicious shortener or non-official domain',
  'Requests Aadhaar, PAN, bank details, or OTPs informally',
  'Outdated deadline, broken portal URL, or inaccurate eligibility',
];

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, savedJobs } = useAuth();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [selectedWarnings, setSelectedWarnings] = useState<string[]>([]);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchJobById(id)
      .then((res) => setJob(res))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4">
        <div className="h-8 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-48 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#172033] dark:text-white mb-2">
          Opportunity Not Found
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400 mb-6">
          This listing may have been removed or the URL is incorrect.
        </p>
        <Link
          to="/jobs"
          className="px-4 py-2 text-sm font-semibold text-white bg-[#14243A] rounded-lg"
        >
          Back to Explore Jobs
        </Link>
      </div>
    );
  }

  const isSaved = savedJobs.some((s) => s.jobId === job.id);

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isSaved) {
      await unsaveJobForUser(user.uid, job.id);
      setActionMessage('Removed from saved jobs.');
    } else {
      await saveJobForUser(user.uid, job);
      setActionMessage('Job saved to your dashboard.');
    }
  };

  const handleGenerateChecklist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.emailVerified) {
      navigate('/dashboard/security');
      return;
    }
    const items = (job.requiredDocuments.length > 0
      ? job.requiredDocuments
      : ['Updated Resume / CV', 'Passport Photograph', 'Scanned Signature', 'Educational Certificates']
    ).map((docName, idx) => ({
      id: `item_${idx}_${Date.now()}`,
      name: docName,
      completed: false,
      specs: 'Verify exact dimensions/KB on official portal',
      allowedFormats: 'PDF / JPEG / PNG',
      maxSizeLabel: 'Up to 500 KB (or per portal rules)',
      guidance: `Keep a clean, legible scan of "${docName}" ready before filling the form.`,
    }));

    await saveDocumentChecklist(user.uid, {
      title: `${job.organization} — ${job.title}`,
      jobId: job.id,
      items,
    });
    navigate('/dashboard/documents');
  };

  const handleTrackApplication = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    await createApplicationRecord(user.uid, {
      jobId: job.id,
      jobTitle: job.title,
      organization: job.organization,
      status: 'Planning to Apply',
      deadline: job.importantDates?.lastDate || job.expiresAt || '',
      applicationURL: job.applicationURL,
      notes: `Source: ${job.officialSourceURL}`,
    });
    navigate('/dashboard/applications');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!reportReason.trim()) return;
    await submitJobReport(user.uid, job.id, job.title, reportReason, selectedWarnings);
    setReportSent(true);
    setReportReason('');
    setSelectedWarnings([]);
  };

  const matchResult = user && profile ? computeJobMatch(job, profile) : null;
  const safety = evaluateJobSafetySignals(job);
  const comparing = isInCompare(job.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] hover:text-[#172033] dark:text-slate-400 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Explore Jobs</span>
      </Link>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 sm:p-8 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] dark:text-slate-400 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#14243A] dark:text-teal-300 capitalize">
              {job.sector}
            </span>
            <span aria-hidden="true">·</span>
            <span>{job.category}</span>
            <span aria-hidden="true">·</span>
            <span>{job.employmentType}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{job.workMode}</span>
          </div>

          {job.verificationStatus === 'verified' ? (
            <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Verified Source
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#F59E0B] font-medium">
              <ShieldAlert className="w-4 h-4" />
              {job.verificationStatus}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-[#172033] dark:text-white mb-2">
          {job.title}
        </h1>
        <p className="text-base font-medium text-[#64748B] dark:text-slate-300 mb-5">
          {job.organization}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-[#E2E8F0] dark:border-slate-800 text-sm mb-6">
          <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-300">
            <MapPin className="w-4 h-4 shrink-0" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-300 tabular-nums">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Last Date: {job.importantDates?.lastDate || job.expiresAt || 'Check official site'}</span>
          </div>
          <div className="text-[#64748B] dark:text-slate-300">
            Salary: <span className="font-medium text-[#172033] dark:text-slate-100">{job.salary}</span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={job.applicationURL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg transition-colors"
          >
            <span>Apply on Official Website</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <Link
            to={`/eligibility/${job.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#14243A] dark:text-teal-300 border border-[#14B8A6] hover:bg-[#CCFBF1]/40 dark:hover:bg-teal-950/30 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Check My Eligibility</span>
          </Link>

          <button
            type="button"
            onClick={handleGenerateChecklist}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Generate Document Checklist</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4 text-[#0D9488]" /> : <Bookmark className="w-4 h-4" />}
            <span>{isSaved ? 'Saved' : 'Save Job'}</span>
          </button>

          <button
            type="button"
            onClick={handleTrackApplication}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span>Track in Applications</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (comparing) {
                removeFromCompare(job.id);
              } else {
                const res = addToCompare(job);
                if (!res.added && res.reason) setActionMessage(res.reason);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
              comparing
                ? 'border-[#14B8A6] bg-[#CCFBF1]/40 text-[#14243A] dark:text-teal-300'
                : 'border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>{comparing ? 'In Compare List' : 'Compare Job'}</span>
          </button>

          <Link
            to={`/assistant?jobId=${job.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:underline"
          >
            <Bot className="w-4 h-4" />
            <span>Ask FormSaathi AI</span>
          </Link>
        </div>

        {actionMessage && (
          <p className="mt-4 text-xs font-medium text-[#16A34A] dark:text-emerald-400">
            {actionMessage}
          </p>
        )}
      </div>

      {/* Detailed Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-[#172033] dark:text-white">Overview &amp; Role Details</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </section>

          {job.responsibilities.length > 0 && (
            <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#172033] dark:text-white">Key Responsibilities &amp; Scope</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-[#64748B] dark:text-slate-300">
                {job.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#172033] dark:text-white">
              Qualifications &amp; Eligibility Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#64748B] dark:text-slate-400">Required Qualifications</p>
                <p className="font-medium text-[#172033] dark:text-slate-100 mt-1">
                  {job.qualifications.join(', ') || 'See official notification'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] dark:text-slate-400">Experience</p>
                <p className="font-medium text-[#172033] dark:text-slate-100 mt-1">{job.experience}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] dark:text-slate-400">Age Criteria</p>
                <p className="font-medium text-[#172033] dark:text-slate-100 mt-1">
                  {job.eligibilityRules?.minAge || job.eligibilityRules?.maxAge
                    ? `${job.eligibilityRules.minAge ?? 18} – ${job.eligibilityRules.maxAge ?? 'No upper limit'} years`
                    : 'Refer to official notification'}
                </p>
                {job.eligibilityRules?.ageRelaxationNote && (
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                    {job.eligibilityRules.ageRelaxationNote}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#64748B] dark:text-slate-400">Application Fee</p>
                <p className="font-medium text-[#172033] dark:text-slate-100 mt-1">{job.applicationFee}</p>
              </div>
            </div>
          </section>

          {job.selectionProcess.length > 0 && (
            <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#172033] dark:text-white">Selection Process</h2>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-[#64748B] dark:text-slate-300">
                {job.selectionProcess.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-[#172033] dark:text-white">Application Instructions</h2>
            <p className="text-sm text-[#64748B] dark:text-slate-300 leading-relaxed">
              {job.applicationInstructions}
            </p>
          </section>
        </div>

        {/* Sidebar Details */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold text-[#172033] dark:text-white">Important Dates</h2>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-xs text-[#64748B] dark:text-slate-400">Notification Reference</dt>
                <dd className="font-medium text-[#172033] dark:text-slate-100">
                  {job.importantDates?.notificationDate || 'Published on official portal'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B] dark:text-slate-400">Last Date / Closing</dt>
                <dd className="font-medium text-[#172033] dark:text-slate-100 tabular-nums">
                  {job.importantDates?.lastDate || job.expiresAt || 'See official link'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-[#172033] dark:text-white">Required Documents</h2>
            <ul className="space-y-2 text-sm text-[#64748B] dark:text-slate-300">
              {job.requiredDocuments.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          {matchResult && (
            <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#14243A] dark:text-white">Profile Match Score</h2>
                <span className="font-mono-num text-base font-bold text-[#0D9488] dark:text-teal-300">
                  {matchResult.score}%
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Based on your qualification, skills, experience, and location preferences.
              </p>
              {matchResult.matchedSkills.length > 0 && (
                <p className="text-xs text-[#16A34A] dark:text-emerald-400">
                  Matched: {matchResult.matchedSkills.join(', ')}
                </p>
              )}
              {matchResult.missingSkills.length > 0 && (
                <p className="text-xs text-[#64748B] dark:text-slate-300">
                  Key skills to highlight: {matchResult.missingSkills.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#172033] dark:text-white">Source &amp; Safety Check</h2>
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
            </div>
            <p className="text-[#64748B] dark:text-slate-400">
              Source: <span className="font-medium text-[#172033] dark:text-slate-200">{job.sourceName || job.organization}</span>
            </p>
            <p className="text-[#64748B] dark:text-slate-400 tabular-nums">
              Last Verified: {job.verifiedAt ? new Date(job.verifiedAt).toLocaleDateString() : 'Reference verified'}
            </p>
            {safety.warningIndicators.length > 0 ? (
              <ul className="space-y-1 text-[#64748B] dark:text-slate-300">
                {safety.warningIndicators.map((sig, idx) => (
                  <li key={idx}>• {sig}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[#16A34A] dark:text-emerald-400">
                No automated safety warnings triggered for this source record.
              </p>
            )}
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 italic">
              Always double-check official portal announcements and never pay unauthorized fees.
            </p>
            <a
              href={job.officialSourceURL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0D9488] dark:text-teal-300 font-semibold hover:underline"
            >
              <span>Open Official Notification</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReportOpen(!reportOpen)}
                className="inline-flex items-center gap-1.5 text-[#64748B] hover:text-[#DC2626]"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report outdated, misleading, or suspicious details</span>
              </button>

              {reportOpen && (
                <form onSubmit={handleReportSubmit} className="mt-3 space-y-2.5">
                  <div className="space-y-1">
                    <p className="font-semibold text-[11px] text-[#172033] dark:text-slate-200">
                      Warning Indicators (Optional):
                    </p>
                    {SCAM_WARNING_INDICATORS.map((ind) => (
                      <label key={ind} className="flex items-start gap-2 text-[11px] text-[#64748B] dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedWarnings.includes(ind)}
                          onChange={(e) =>
                            setSelectedWarnings((prev) =>
                              e.target.checked ? [...prev, ind] : prev.filter((x) => x !== ind)
                            )
                          }
                          className="mt-0.5 rounded border-slate-300 text-[#14B8A6]"
                        />
                        <span>{ind}</span>
                      </label>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe what changed or seemed suspicious..."
                    className="w-full p-2 text-xs bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-[#14243A] text-white rounded-md"
                  >
                    Submit Safety Report
                  </button>
                  {reportSent && (
                    <p className="text-xs text-[#16A34A]">Thank you — report logged for admin moderation.</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
