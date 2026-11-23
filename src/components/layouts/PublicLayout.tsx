import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { GitCompare, Info, X } from 'lucide-react';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import { useCompare } from '../../context/CompareContext';
import { fetchPlatformAnnouncement } from '../../services/firestoreService';
import type { PlatformSetting } from '../../types';

export function PublicLayout() {
  const [announcement, setAnnouncement] = useState<PlatformSetting | null>(null);
  const { compareJobs, clearCompare } = useCompare();

  useEffect(() => {
    fetchPlatformAnnouncement().then((s) => {
      if (s && s.showAnnouncement && s.announcementBanner) {
        setAnnouncement(s);
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#0B1320] text-[#172033] dark:text-slate-100">
      {announcement && (
        <div className="no-print bg-[#14243A] text-white text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-2 text-center">
          <Info className="w-4 h-4 text-[#14B8A6] shrink-0" />
          <span>{announcement.announcementBanner}</span>
        </div>
      )}
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>

      {compareJobs.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100%-2rem)] bg-[#14243A] text-white border border-[#1D3557] rounded-xl px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <GitCompare className="w-4 h-4 text-[#14B8A6] shrink-0" />
            <div className="text-xs min-w-0">
              <span className="font-semibold font-mono-num">{compareJobs.length}/3</span> jobs selected:{' '}
              <span className="text-slate-300 truncate">
                {compareJobs.map((j) => j.title).join(' · ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/tools/compare-jobs"
              className="px-3 py-1.5 text-xs font-semibold bg-[#14B8A6] text-[#14243A] hover:bg-teal-400 rounded-lg"
            >
              Compare Now
            </Link>
            <button
              type="button"
              onClick={clearCompare}
              aria-label="Clear compare list"
              className="p-1.5 text-slate-300 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
