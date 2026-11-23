import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BellRing,
  Check,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Mail,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchCategories,
  fetchVerifiedJobs,
  filterMatchingJobsByCategories,
  markAllNotificationsRead,
  markNotificationRead,
  sendSimulatedJobAlertEmailDigest,
  syncMatchingJobAlertsForUser,
  updateUserProfileRecord,
} from '../services/firestoreService';
import type { JobCategory, JobListing, NotificationItem } from '../types';

interface JobAlertsSubscriptionProps {
  compact?: boolean;
  onClose?: () => void;
  onSelectedCategoriesChange?: (categories: string[]) => void;
}

type AlertFrequency = 'instant' | 'daily' | 'weekly';

export function JobAlertsSubscription({
  compact = false,
  onClose,
  onSelectedCategoriesChange,
}: JobAlertsSubscriptionProps) {
  const { user, profile, notifications, refreshProfile, resendVerificationEmail } = useAuth();
  const { language } = useLanguage();

  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [frequency, setFrequency] = useState<AlertFrequency>('instant');

  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [verificationResent, setVerificationResent] = useState(false);

  useEffect(() => {
    setLoadingCatalog(true);
    Promise.all([fetchCategories(), fetchVerifiedJobs()])
      .then(([cats, jobRes]) => {
        setCategories(cats);
        setJobs(jobRes.jobs);
      })
      .catch(() => {
        setCategories([]);
        setJobs([]);
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  useEffect(() => {
    if (profile) {
      setSelectedCategories(profile.preferredCategories || []);
      setEmailAlertsEnabled(
        profile.notificationPrefs?.jobAlertEmailEnabled ??
          profile.notificationPrefs?.matchingJobs ??
          true
      );
      setFrequency(profile.notificationPrefs?.jobAlertFrequency || 'instant');
    }
  }, [profile]);

  useEffect(() => {
    onSelectedCategoriesChange?.(selectedCategories);
  }, [selectedCategories, onSelectedCategoriesChange]);

  const categoryJobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      if (job.verificationStatus !== 'verified') continue;
      const key = job.category.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [jobs]);

  const matchingJobs = useMemo(
    () => filterMatchingJobsByCategories(jobs, selectedCategories),
    [jobs, selectedCategories]
  );

  const alertEmails = useMemo(
    () => notifications.filter((n) => n.type === 'matching_job'),
    [notifications]
  );

  const unreadAlertCount = useMemo(
    () => alertEmails.filter((n) => !n.read).length,
    [alertEmails]
  );

  const activeEmail: NotificationItem | null = useMemo(() => {
    if (alertEmails.length === 0) return null;
    return alertEmails.find((e) => e.id === selectedEmailId) || alertEmails[0];
  }, [alertEmails, selectedEmailId]);

  const toggleCategory = (catName: string) => {
    setFeedback(null);
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === catName.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.toLowerCase() !== catName.toLowerCase());
      }
      if (prev.length >= 20) {
        setFeedback({
          kind: 'error',
          text: 'You can subscribe to a maximum of 20 job categories at a time.',
        });
        return prev;
      }
      return [...prev, catName];
    });
  };

  const handleSelectAll = () => {
    setFeedback(null);
    setSelectedCategories(categories.slice(0, 20).map((c) => c.name));
  };

  const handleClearAll = () => {
    setFeedback(null);
    setSelectedCategories([]);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.emailVerified) {
      setFeedback({
        kind: 'error',
        text: 'Please verify your email address before saving alert subscriptions to Firestore.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const existingPrefs = profile?.notificationPrefs || {
        matchingJobs: true,
        deadlines: true,
        interviews: true,
        resumeReminders: true,
      };

      await updateUserProfileRecord(user.uid, {
        preferredCategories: selectedCategories.slice(0, 20),
        notificationPrefs: {
          ...existingPrefs,
          matchingJobs: emailAlertsEnabled,
          jobAlertEmailEnabled: emailAlertsEnabled,
          jobAlertFrequency: frequency,
        },
      });
      await refreshProfile();

      let syncedCount = 0;
      if (emailAlertsEnabled && selectedCategories.length > 0) {
        syncedCount = await syncMatchingJobAlertsForUser(
          user.uid,
          user.email || profile?.email || '',
          selectedCategories,
          notifications,
          jobs,
          3
        );
      }

      setFeedback({
        kind: 'success',
        text:
          syncedCount > 0
            ? `Subscription saved. Delivered ${syncedCount} simulated email notification(s) for matching verified jobs.`
            : selectedCategories.length === 0
              ? 'Subscription updated. No categories are currently selected.'
              : 'Job alert preferences saved. Your simulated email inbox is up to date.',
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Unable to save job alert subscription.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSimulateEmailAlert = async () => {
    if (!user || !user.emailVerified) return;
    if (selectedCategories.length === 0) {
      setFeedback({
        kind: 'error',
        text: 'Select at least one job category first to receive a simulated matching job email.',
      });
      return;
    }

    setSimulating(true);
    setFeedback(null);
    try {
      const res = await sendSimulatedJobAlertEmailDigest(
        user.uid,
        user.email || profile?.email || '',
        selectedCategories,
        jobs
      );
      setFeedback({
        kind: 'success',
        text: `Simulated alert email delivered to your In-App Email Inbox: "${res.subject}"`,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Unable to send simulated email alert.',
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleOpenEmail = async (item: NotificationItem) => {
    setSelectedEmailId(item.id);
    if (user && !item.read) {
      await markNotificationRead(user.uid, item.id).catch(() => undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Configuration Panel */}
      <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#0D9488] dark:text-teal-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-[#14243A] dark:text-white">
                Job Alerts Subscription
              </h2>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-2xl">
              Choose your preferred career categories to receive simulated in-app email notifications whenever verified matching opportunities are available.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono-num text-[#64748B] dark:text-slate-300">
              {selectedCategories.length} selected · {matchingJobs.length} live matches
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Unverified email notice */}
        {user && !user.emailVerified && (
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Verify your account email ({user.email}) to persist Job Alerts and receive simulated in-app email notifications.
            </span>
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setVerificationResent(true);
              }}
              className="font-semibold underline whitespace-nowrap text-left"
            >
              {verificationResent ? 'Verification Email Sent' : 'Resend Verification Link'}
            </button>
          </div>
        )}

        <form onSubmit={handleSaveSubscription} className="space-y-5">
          {/* Category Multi-Select Grid */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-[#172033] dark:text-slate-200">
                Preferred Job Categories
              </label>
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-medium text-[#0D9488] dark:text-teal-300 hover:underline"
                >
                  Select all
                </button>
                <span aria-hidden="true" className="text-[#E2E8F0] dark:text-slate-700">
                  |
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="font-medium text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white"
                >
                  Clear selection
                </button>
              </div>
            </div>

            {loadingCatalog ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {categories.map((cat) => {
                  const active = selectedCategories.some(
                    (c) => c.toLowerCase() === cat.name.toLowerCase()
                  );
                  const count = categoryJobCounts.get(cat.name.toLowerCase()) || 0;
                  const label = language === 'hi' && cat.nameHi ? cat.nameHi : cat.name;

                  return (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      aria-pressed={active}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left text-xs transition-colors ${
                        active
                          ? 'bg-[#14243A] text-white border-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] dark:border-[#14B8A6]'
                          : 'bg-[#F8FAFC] dark:bg-[#0B1320] text-[#172033] dark:text-slate-200 border-[#E2E8F0] dark:border-slate-700 hover:border-[#14B8A6]'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            active
                              ? 'border-white/50 dark:border-[#14243A]/40 bg-white/15 dark:bg-[#14243A]/15'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                        </span>
                        <span className="font-medium truncate">{label}</span>
                      </span>
                      <span
                        className={`font-mono-num text-[11px] shrink-0 ${
                          active
                            ? 'text-teal-200 dark:text-[#14243A]/80'
                            : 'text-[#64748B] dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivery Channel & Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200">
                Simulated Email Recipient
              </label>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B1320] border border-[#E2E8F0] dark:border-slate-700 text-xs">
                <span className="flex items-center gap-2 min-w-0 text-[#172033] dark:text-slate-200">
                  <Mail className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <span className="truncate font-mono-num">
                    {user?.email || 'Sign in to link your email'}
                  </span>
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 font-medium">
                  <input
                    type="checkbox"
                    checked={emailAlertsEnabled}
                    onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-[#14B8A6]"
                  />
                  <span>Active</span>
                </label>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                Alerts are delivered in-app to your Simulated Email Inbox and Notifications feed (no external SMTP mail sent).
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#172033] dark:text-slate-200">
                Notification Cadence
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {(
                  [
                    ['instant', 'Instant Match'],
                    ['daily', 'Daily Digest'],
                    ['weekly', 'Weekly Roundup'],
                  ] as const
                ).map(([val, text]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFrequency(val)}
                    className={`py-2 px-2 rounded-md font-medium whitespace-nowrap transition-colors ${
                      frequency === val
                        ? 'bg-white dark:bg-[#131E30] text-[#14243A] dark:text-teal-300 shadow-xs'
                        : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                New verified jobs matching your selected categories trigger automatic in-app alert checks.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                feedback.kind === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-[#16A34A]'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-[#DC2626]'
              }`}
            >
              {feedback.kind === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {user ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="submit"
                  disabled={saving || !user.emailVerified}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                  <span>{saving ? 'Saving...' : 'Save Subscription & Sync'}</span>
                </button>
                <button
                  type="button"
                  disabled={simulating || !user.emailVerified}
                  onClick={handleSimulateEmailAlert}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 hover:border-[#14B8A6] text-[#172033] dark:text-slate-200 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>{simulating ? 'Sending...' : 'Send Simulated Email Alert'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg whitespace-nowrap shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Sign in to Subscribe &amp; Receive Alerts</span>
                </Link>
                <span className="text-xs text-[#64748B] dark:text-slate-400">
                  {matchingJobs.length} verified opening(s) match your preview selection.
                </span>
              </div>
            )}

            {user && !compact && (
              <Link
                to="/dashboard/recommended"
                className="text-xs font-semibold text-[#0D9488] dark:text-teal-300 hover:underline whitespace-nowrap"
              >
                View {matchingJobs.length} matching jobs &rarr;
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Simulated In-App Email Inbox (shown for signed-in users, or preview card in full mode) */}
      {!compact && (
        <section className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#0D9488] dark:text-teal-400" />
              <h3 className="text-sm font-bold text-[#14243A] dark:text-white">
                Simulated In-App Email Inbox
              </h3>
              <span className="text-xs font-mono-num text-[#64748B] dark:text-slate-400">
                · {alertEmails.length} message(s) · {unreadAlertCount} unread
              </span>
            </div>

            {user && unreadAlertCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead(user.uid, alertEmails)}
                className="text-xs font-semibold text-[#0D9488] dark:text-teal-300 hover:underline"
              >
                Mark all alert emails read
              </button>
            )}
          </div>

          {!user ? (
            <div className="p-8 text-center space-y-2">
              <Mail className="w-7 h-7 text-[#64748B] mx-auto" />
              <p className="text-sm font-medium text-[#172033] dark:text-slate-200">
                Sign in to view your Simulated In-App Email Inbox
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                Once signed in, matching job alert emails appear here in real time whenever verified opportunities match your subscribed categories.
              </p>
            </div>
          ) : alertEmails.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Mail className="w-7 h-7 text-[#64748B] mx-auto" />
              <p className="text-sm font-medium text-[#172033] dark:text-slate-200">
                No job alert emails yet
              </p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
                Select one or more job categories above and click &ldquo;Save Subscription &amp; Sync&rdquo; or &ldquo;Send Simulated Email Alert&rdquo; to receive your first matching alert email.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] dark:divide-slate-800">
              {/* Inbox List */}
              <div className="lg:col-span-5 divide-y divide-[#E2E8F0] dark:divide-slate-800 max-h-[380px] overflow-y-auto">
                {alertEmails.map((item) => {
                  const isSelected = activeEmail?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenEmail(item)}
                      className={`w-full text-left px-4 py-3.5 transition-colors space-y-1 ${
                        isSelected
                          ? 'bg-[#F8FAFC] dark:bg-slate-800/60'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#64748B] dark:text-slate-400">
                        <span className="font-medium text-[#172033] dark:text-slate-200 truncate">
                          FormSaathi Job Alerts
                        </span>
                        <span className="font-mono-num shrink-0">
                          {item.read ? 'Read' : 'Unread'} ·{' '}
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Now'}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate ${
                          item.read
                            ? 'font-medium text-[#172033] dark:text-slate-200'
                            : 'font-bold text-[#14243A] dark:text-white'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-2">
                        {item.message}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Email Reader Pane */}
              <div className="lg:col-span-7 p-5 sm:p-6 space-y-4">
                {activeEmail && (
                  <>
                    <div className="space-y-2 pb-4 border-b border-[#E2E8F0] dark:border-slate-800">
                      <h4 className="text-base font-bold text-[#14243A] dark:text-white">
                        {activeEmail.title}
                      </h4>
                      <div className="text-xs text-[#64748B] dark:text-slate-400 space-y-0.5 font-mono-num">
                        <p>From: FormSaathi Job Alerts &lt;alerts@formsaathi.in&gt;</p>
                        <p>To: {user.email}</p>
                        <p>
                          Received:{' '}
                          {activeEmail.createdAt
                            ? new Date(activeEmail.createdAt).toLocaleString()
                            : 'Just now'}{' '}
                          · Simulated In-App Delivery
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-[#172033] dark:text-slate-200 leading-relaxed space-y-3">
                      <p>Hello {profile?.name || user.displayName || 'Candidate'},</p>
                      <p>{activeEmail.message}</p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400">
                        Always confirm final eligibility, application fees, and closing dates on the official employer or government portal before applying.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      {activeEmail.link && (
                        <Link
                          to={activeEmail.link}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                        >
                          <span>View Matching Opportunity</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <Link
                        to="/eligibility"
                        className="px-4 py-2 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:border-[#14B8A6]"
                      >
                        Check Eligibility
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
