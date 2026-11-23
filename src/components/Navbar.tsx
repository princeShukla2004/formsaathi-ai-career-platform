import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  FileCheck2,
  FileSearch,
  FileText,
  GitCompare,
  Globe,
  GraduationCap,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Moon,
  ShieldCheck,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const CAREER_TOOL_ITEMS = [
  { to: '/assistant', label: 'AI Career Assistant', desc: 'Bilingual guidance in English & Hindi', icon: Bot },
  { to: '/resume-studio', label: 'Resume Studio', desc: 'Build & export clean ATS resumes', icon: FileText },
  { to: '/tools/resume-analyzer', label: 'Resume Analyzer', desc: 'ATS score & keyword gap breakdown', icon: FileSearch },
  { to: '/tools/mock-interview', label: 'AI Mock Interview', desc: 'Role-based Q&A practice & scoring', icon: Mic },
  { to: '/tools/mock-tests', label: 'Mock Tests', desc: 'Timed SSC, Banking, Railway & UPSC sets', icon: ClipboardCheck },
  { to: '/tools/career-roadmap', label: 'Career Roadmap', desc: 'Stage-wise skill & project blueprint', icon: Compass },
  { to: '/tools/form-assistant', label: 'Government Form Assistant', desc: 'Fields, specs & document checklist', icon: FileCheck2 },
  { to: '/tools/exam-calendar', label: 'Exam Calendar', desc: 'Verified official calendars & reminders', icon: Calendar },
  { to: '/tools/photo-resizer', label: 'Photo & Signature Resizer', desc: 'Exact px & KB sizing for forms', icon: ImageIcon },
  { to: '/tools/learning-hub', label: 'Skills & Learning Hub', desc: 'Excel, SQL, Power BI, Interview prep', icon: GraduationCap },
  { to: '/tools/compare-jobs', label: 'Compare Jobs', desc: 'Side-by-side comparison up to 3 roles', icon: GitCompare },
  { to: '/eligibility', label: 'Eligibility Checker', desc: 'Deterministic rule match engine', icon: CheckCircle2 },
];

export function Navbar() {
  const { user, profile, notifications, isAdmin, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
      isActive
        ? 'text-[#14243A] dark:text-[#14B8A6] border-b-2 border-[#14B8A6]'
        : 'text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white'
    }`;

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-sm border-b border-[#E2E8F0] dark:border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#14243A] dark:text-white whitespace-nowrap shrink-0"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="28" height="28" rx="7" fill="#14243A" />
            <path d="M8 9.5H20M8 14H16.5M8 18.5H13" stroke="#14B8A6" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="19" cy="18.5" r="2.2" fill="#CCFBF1" />
          </svg>
          <span>{t('brandName')}</span>
        </Link>

        {/* Zone 2: Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-5" aria-label="Primary">
          <NavLink to="/" end className={navLinkClass}>
            {t('navHome')}
          </NavLink>
          <NavLink to="/jobs" end className={navLinkClass}>
            {t('navExplore')}
          </NavLink>
          <NavLink to="/jobs/government" className={navLinkClass}>
            {t('navGov')}
          </NavLink>
          <NavLink to="/jobs/private" className={navLinkClass}>
            {t('navPrivate')}
          </NavLink>
          <NavLink to="/jobs/internships" className={navLinkClass}>
            Internships
          </NavLink>

          {/* Career Tools Dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen((p) => !p)}
              aria-expanded={toolsOpen}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white whitespace-nowrap shrink-0 py-1"
            >
              <span>Career Tools</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {toolsOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[560px] bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-xl p-4 grid grid-cols-2 gap-2 z-50">
                {CAREER_TOOL_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setToolsOpen(false)}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[#0D9488] dark:text-[#14B8A6] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#172033] dark:text-slate-100 truncate">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                          {item.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <NavLink to="/resources" className={navLinkClass}>
            {t('navResources')}
          </NavLink>
        </nav>

        {/* Zone 3: Language, Theme, Auth / Personalized Menu */}
        <div className="hidden xl:flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            aria-label="Switch language"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'EN / हिं' : 'हिं / EN'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
            className="p-2 text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700 rounded-lg transition-colors shrink-0"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 shrink-0" ref={profileRef}>
              <Link
                to="/dashboard/notifications"
                aria-label="Notifications"
                className="relative p-2 text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 text-[10px] font-mono-num font-bold bg-[#14B8A6] text-[#14243A] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((p) => !p)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg transition-colors whitespace-nowrap"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[110px] truncate">
                    {profile?.name || user.displayName || 'Workspace'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-3.5 py-2 border-b border-[#E2E8F0] dark:border-slate-800">
                      <p className="text-xs font-semibold text-[#172033] dark:text-white truncate">
                        {profile?.name || user.displayName || 'Candidate'}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Candidate Dashboard</span>
                    </Link>
                    <Link
                      to="/dashboard/recommended"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488]" />
                      <span>Recommended Jobs</span>
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#0D9488] dark:text-teal-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{t('navAdmin')}</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 border-t border-[#E2E8F0] dark:border-slate-800 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/login"
                className="text-sm font-medium text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white whitespace-nowrap shrink-0"
              >
                {t('navLogin')}
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#14243A] hover:bg-[#1D3557] dark:bg-[#14B8A6] dark:text-[#14243A] dark:hover:bg-teal-400 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {t('navGetStarted')}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile & Tablet menu button */}
        <div className="flex xl:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            aria-label="Switch language"
            className="px-2 py-1.5 text-xs font-medium text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            {language === 'en' ? 'हिं' : 'EN'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 text-[#172033] dark:text-white border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden bg-white dark:bg-[#131E30] border-t border-[#E2E8F0] dark:border-slate-800 px-4 py-4 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              {t('navHome')}
            </Link>
            <Link to="/jobs" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              {t('navExplore')}
            </Link>
            <Link to="/jobs/government" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              {t('navGov')}
            </Link>
            <Link to="/jobs/private" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              {t('navPrivate')}
            </Link>
            <Link to="/jobs/internships" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              Internships
            </Link>
            <Link to="/resources" onClick={() => setMobileOpen(false)} className="text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              {t('navResources')}
            </Link>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-2 mb-2">
              Career Tools
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {CAREER_TOOL_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 text-sm font-medium py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Icon className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                >
                  {t('navDashboard')}
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-2.5 text-sm font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200"
                  >
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg text-[#172033] dark:text-slate-200"
                >
                  {t('navLogin')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
                >
                  {t('navGetStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
