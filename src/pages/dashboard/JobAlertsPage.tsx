import { useEffect, useState } from 'react';
import { BellOff, BellRing, CheckCircle2, Tag } from 'lucide-react';
import { JobAlertsSubscription } from '../../components/JobAlertsSubscription';
import { useAuth } from '../../context/AuthContext';

const FREQUENCY_LABELS: Record<'instant' | 'daily' | 'weekly', string> = {
  instant: 'Instant Match',
  daily: 'Daily Digest',
  weekly: 'Weekly Roundup',
};

export function JobAlertsPage() {
  const { profile, authReady } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    profile?.preferredCategories || []
  );

  useEffect(() => {
    if (profile?.preferredCategories) {
      setSelectedCategories(profile.preferredCategories);
    }
  }, [profile]);

  const savedCategories = profile?.preferredCategories || [];
  const alertsEnabled =
    profile?.notificationPrefs?.jobAlertEmailEnabled ??
    profile?.notificationPrefs?.matchingJobs ??
    true;
  const frequency = profile?.notificationPrefs?.jobAlertFrequency || 'instant';

  const savedSet = new Set(savedCategories.map((c) => c.toLowerCase()));
  const selectedSet = new Set(selectedCategories.map((c) => c.toLowerCase()));
  const hasUnsavedChanges =
    savedSet.size !== selectedSet.size ||
    [...selectedSet].some((cat) => !savedSet.has(cat));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          Job Alerts &amp; Email Digest
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Subscribe to verified Indian job categories and inspect simulated in-app email notifications for new matches.
        </p>
      </div>

      {/* Selected Notification Categories Summary */}
      <section
        aria-label="Selected Notification Categories Summary"
        className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {alertsEnabled && selectedCategories.length > 0 ? (
              <BellRing className="w-4 h-4 text-[#0D9488] dark:text-teal-400 shrink-0" />
            ) : (
              <BellOff className="w-4 h-4 text-[#64748B] dark:text-slate-400 shrink-0" />
            )}
            <h2 className="text-sm font-bold text-[#14243A] dark:text-white">
              Currently Selected Notification Categories
            </h2>
          </div>

          <div className="text-xs font-mono-num text-[#64748B] dark:text-slate-400 flex flex-wrap items-center gap-2">
            <span>{selectedCategories.length} active</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                alertsEnabled
                  ? 'text-[#16A34A] dark:text-emerald-400 font-semibold'
                  : 'text-[#64748B] dark:text-slate-400'
              }
            >
              {alertsEnabled ? 'In-App Email On' : 'Paused'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{FREQUENCY_LABELS[frequency]}</span>
            {hasUnsavedChanges && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Unsaved changes
                </span>
              </>
            )}
          </div>
        </div>

        {!authReady ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-7 w-28 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : selectedCategories.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 py-1">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>
              No notification categories selected yet. Choose your preferred categories below to receive matching job alerts.
            </span>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Selected categories list">
            {selectedCategories.map((category) => (
              <li
                key={category}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#14B8A6]/40 bg-[#CCFBF1]/35 dark:bg-teal-950/40 dark:border-teal-700/60 text-xs font-medium text-[#14243A] dark:text-teal-200 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] dark:text-teal-400 shrink-0" />
                <span>{category}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <JobAlertsSubscription onSelectedCategoriesChange={setSelectedCategories} />
    </div>
  );
}
