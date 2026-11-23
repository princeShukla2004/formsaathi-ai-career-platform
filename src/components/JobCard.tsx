import { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitCompare,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';
import { useLanguage } from '../context/LanguageContext';
import { saveJobForUser, unsaveJobForUser } from '../services/firestoreService';
import type { JobListing, JobMatchResult } from '../types';
import { evaluateJobSafetySignals } from '../utils/scamDetector';

interface JobCardProps {
  job: JobListing;
  matchResult?: JobMatchResult;
}

export function JobCard({ job, matchResult }: JobCardProps) {
  const { user, savedJobs } = useAuth();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [compareNote, setCompareNote] = useState('');

  const isSaved = savedJobs.some((s) => s.jobId === job.id);
  const compared = isInCompare(job.id);
  const safety = evaluateJobSafetySignals(job);

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!user.emailVerified) {
      navigate('/dashboard/security');
      return;
    }
    setBusy(true);
    try {
      if (isSaved) {
        await unsaveJobForUser(user.uid, job.id);
      } else {
        await saveJobForUser(user.uid, job);
      }
    } catch (err) {
      console.error('Failed to toggle save job:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCompare = () => {
    setCompareNote('');
    if (compared) {
      removeFromCompare(job.id);
      return;
    }
    const res = addToCompare(job);
    if (!res.added && res.reason) {
      setCompareNote(res.reason);
      setTimeout(() => setCompareNote(''), 2500);
    }
  };

  const statusColor =
    job.verificationStatus === 'verified'
      ? 'text-[#16A34A] dark:text-emerald-400'
      : job.verificationStatus === 'expired'
      ? 'text-[#DC2626] dark:text-red-400'
      : 'text-[#F59E0B] dark:text-amber-400';

  const statusText =
    job.verificationStatus === 'verified'
      ? safety.warningIndicators.length > 0
        ? 'Review Notice'
        : t('verifiedLabel')
      : job.verificationStatus === 'expired'
      ? t('expiredLabel')
      : t('pendingLabel');

  const StatusIcon =
    job.verificationStatus === 'verified' && safety.warningIndicators.length === 0
      ? CheckCircle2
      : job.verificationStatus === 'expired' || safety.warningIndicators.length > 0
      ? ShieldAlert
      : Clock;

  return (
    <article className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between transition-colors hover:border-[#14B8A6]/60 dark:hover:border-teal-600/60">
      <div>
        {/* Quiet 1-line unboxed metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] dark:text-slate-400 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[#14243A] dark:text-teal-300 capitalize">
              {job.sector}
            </span>
            <span aria-hidden="true">·</span>
            <span>{job.category}</span>
            <span aria-hidden="true">·</span>
            <span>{job.employmentType}</span>
          </div>
          <span className={`inline-flex items-center gap-1 font-medium ${statusColor}`}>
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{statusText}</span>
          </span>
        </div>

        {/* Title & Organization */}
        <h3 className="text-lg font-semibold text-[#172033] dark:text-slate-100 leading-snug mb-1.5">
          <Link
            to={`/jobs/${job.id}`}
            className="hover:text-[#0D9488] dark:hover:text-teal-300 transition-colors"
          >
            {job.title}
          </Link>
        </h3>
        <p className="text-sm font-medium text-[#64748B] dark:text-slate-300 mb-3">
          {job.organization}
        </p>

        {matchResult && (
          <div className="mb-3 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#14243A] dark:text-teal-300">
                Profile Match: <span className="font-mono-num">{matchResult.score}%</span> ({matchResult.tier})
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                Qual: {matchResult.qualificationMatch}
              </span>
            </div>
            {matchResult.matchedSkills.length > 0 && (
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate">
                Matched skills: {matchResult.matchedSkills.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Key Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs text-[#64748B] dark:text-slate-400 mb-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#64748B]" />
            <span className="truncate">{job.location}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 tabular-nums">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-[#64748B]" />
            <span className="truncate">
              Last date: {job.importantDates?.lastDate || job.expiresAt || 'See official portal'}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#64748B] dark:text-slate-400 mb-5">
          Experience: <span className="text-[#172033] dark:text-slate-200 font-medium">{job.experience}</span>
          <span className="mx-2" aria-hidden="true">·</span>
          Salary: <span className="text-[#172033] dark:text-slate-200 font-medium">{job.salary}</span>
        </p>

        {compareNote && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">{compareNote}</p>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            to={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] dark:hover:bg-teal-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {t('viewDetails')}
          </Link>
          <a
            href={job.officialSourceURL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-2 text-xs font-medium text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            title="Official Source"
          >
            <span>Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleCompare}
            aria-label={compared ? 'Remove from comparison' : 'Add to job comparison'}
            className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              compared
                ? 'border-[#14B8A6] text-[#0D9488] dark:text-teal-300 bg-[#CCFBF1]/40 dark:bg-teal-950/40'
                : 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{compared ? 'Comparing' : 'Compare'}</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleToggleSave}
            aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
            className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isSaved
                ? 'border-[#14B8A6] text-[#0D9488] dark:text-teal-300 bg-[#CCFBF1]/40 dark:bg-teal-950/40'
                : 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white'
            }`}
          >
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{isSaved ? t('saved') : t('saveJob')}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
