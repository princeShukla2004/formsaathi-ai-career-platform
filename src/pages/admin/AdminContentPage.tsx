import React, { useEffect, useState } from 'react';
import { CheckCircle2, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchPlatformAnnouncement,
  savePlatformSettingsAdmin,
} from '../../services/firestoreService';

export function AdminContentPage() {
  const { user } = useAuth();
  const [announcementBanner, setAnnouncementBanner] = useState('');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [aiDailyLimitFree, setAiDailyLimitFree] = useState(15);
  const [eligibilityLimitFree, setEligibilityLimitFree] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    fetchPlatformAnnouncement()
      .then((res) => {
        if (res) {
          setAnnouncementBanner(res.announcementBanner || '');
          setShowAnnouncement(res.showAnnouncement);
          setAiDailyLimitFree(res.aiDailyLimitFree);
          setEligibilityLimitFree(res.eligibilityLimitFree);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await savePlatformSettingsAdmin(user.uid, user.email || '', {
        announcementBanner,
        showAnnouncement,
        aiDailyLimitFree,
        eligibilityLimitFree,
      });
      setSavedMsg('Platform announcement banner and free-tier quotas saved to Firestore.');
    } catch (err) {
      setSavedMsg(err instanceof Error ? err.message : 'Unable to save content settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
          Content &amp; Announcement Management
        </h1>
        <p className="text-sm text-[#64748B] dark:text-slate-400">
          Manage site-wide career alerts and free-tier daily usage guidelines stored in `platformSettings/default`.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-[#16A34A] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-6 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-sm text-[#64748B]">
          Loading platform settings...
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 space-y-5"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#14B8A6]" /> Site-Wide Announcement Banner
              </label>
              <label className="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={showAnnouncement}
                  onChange={(e) => setShowAnnouncement(e.target.checked)}
                />
                Show on public site
              </label>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={announcementBanner}
              onChange={(e) => setAnnouncementBanner(e.target.value)}
              placeholder="e.g. UPSC & SSC calendar deadlines updated for this month — always verify dates on upsc.gov.in and ssc.gov.in before applying."
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320]"
            />
            <p className="text-[11px] text-[#64748B] dark:text-slate-400">
              Maximum 300 characters. Rendered cleanly in the public announcement bar when enabled.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                Free Tier Daily AI Query Guidance
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={aiDailyLimitFree}
                onChange={(e) => setAiDailyLimitFree(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320] font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-slate-400 mb-1">
                Free Tier Eligibility Check Guidance
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={eligibilityLimitFree}
                onChange={(e) => setEligibilityLimitFree(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] dark:border-slate-700 rounded-lg bg-white dark:bg-[#0B1320] font-mono-num"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Platform Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
