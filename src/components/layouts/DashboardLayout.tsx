import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  CreditCard,
  FileCheck2,
  FileSearch,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  Sparkles,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const DASHBOARD_GROUPS = [
  {
    title: 'Discover & Track',
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/jobs', label: 'Explore Jobs', icon: Search },
      { to: '/dashboard/recommended', label: 'Recommended Jobs', icon: Sparkles },
      { to: '/dashboard/saved', label: 'Saved Jobs', icon: Bookmark },
      { to: '/dashboard/applications', label: 'My Applications', icon: Briefcase },
      { to: '/eligibility', label: 'Eligibility Checker', icon: CheckCircle2 },
      { to: '/dashboard/eligibility', label: 'Eligibility History', icon: Compass },
    ],
  },
  {
    title: 'Career & AI Tools',
    items: [
      { to: '/resume-studio', label: 'Resume Studio', icon: FileText },
      { to: '/dashboard/resumes', label: 'Saved Resumes', icon: FileCheck2 },
      { to: '/dashboard/resume-analyzer', label: 'Resume Analyzer', icon: FileSearch },
      { to: '/dashboard/mock-interview', label: 'AI Mock Interview', icon: Mic },
      { to: '/dashboard/mock-tests', label: 'Mock Tests', icon: ClipboardCheck },
      { to: '/dashboard/career-roadmap', label: 'Career Roadmap', icon: MapIcon },
      { to: '/dashboard/exam-calendar', label: 'Exam Calendar', icon: CalendarDays },
      { to: '/dashboard/learning-hub', label: 'Learning Hub', icon: BookOpen },
      { to: '/dashboard/form-assistant', label: 'Form Assistant', icon: MessageSquare },
      { to: '/dashboard/ai-history', label: 'AI Chat History', icon: MessageSquare },
      { to: '/dashboard/documents', label: 'Document Checklist', icon: FileCheck2 },
    ],
  },
  {
    title: 'Inbox & Account',
    items: [
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/job-alerts', label: 'Job Alerts', icon: Mail },
      { to: '/dashboard/profile', label: 'Profile Settings', icon: User },
      { to: '/dashboard/security', label: 'Account Security', icon: Shield },
      { to: '/dashboard/subscription', label: 'Plan & Access', icon: CreditCard },
    ],
  },
];

export function DashboardLayout() {
  const { user, profile, notifications, isAdmin, logout, resendVerificationEmail } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadJobAlertCount = notifications.filter(
    (n) => !n.read && n.type === 'matching_job'
  ).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderBadge = (to: string, isCollapsed: boolean) => {
    const count =
      to === '/dashboard/notifications'
        ? unreadCount
        : to === '/dashboard/job-alerts'
          ? unreadJobAlertCount
          : 0;
    if (!count || isCollapsed) return null;
    return (
      <span className="text-[11px] font-mono-num font-semibold px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#14243A]">
        {count}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B1320] text-[#172033] dark:text-slate-100">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col border-r border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#131E30] shrink-0 transition-all duration-200 ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800">
          {!collapsed && (
            <Link to="/" className="text-lg font-bold tracking-tight text-[#14243A] dark:text-white">
              FormSaathi
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#172033] dark:hover:text-white mx-auto lg:mx-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
          {DASHBOARD_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-500 mb-1">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center ${
                        collapsed ? 'justify-center px-2' : 'justify-between px-3'
                      } py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A]'
                          : 'text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#172033] dark:hover:text-white'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </span>
                    {renderBadge(item.to, collapsed)}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-2.5 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              title="Admin Panel"
              className={`flex items-center ${
                collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
              } py-2 text-sm font-medium text-[#0D9488] dark:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'
            } py-2 text-sm font-medium text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-full bg-white dark:bg-[#131E30] h-full flex flex-col border-r border-[#E2E8F0] dark:border-slate-800 z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800">
              <span className="text-lg font-bold text-[#14243A] dark:text-white">FormSaathi</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-[#64748B]"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
              {DASHBOARD_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1">
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-500">
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg ${
                            isActive
                              ? 'bg-[#14243A] text-white dark:bg-[#14B8A6] dark:text-[#14243A]'
                              : 'text-[#64748B] dark:text-slate-300'
                          }`
                        }
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                        {renderBadge(item.to, false)}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-[#E2E8F0] dark:border-slate-800 space-y-1">
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-[#0D9488]"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-[#DC2626]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#131E30] border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-[#64748B] dark:text-slate-400 truncate">
              Candidate Workspace · {profile?.name || user?.displayName || user?.email}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/tools/compare-jobs"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span>Compare Jobs</span>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Public Site</span>
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {user && !user.emailVerified && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-amber-900 dark:text-amber-200">
            <span>
              Please verify your email address ({user.email}) to enable saving jobs, resumes, and applications to Firestore.
            </span>
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setVerifySent(true);
              }}
              className="px-3 py-1 text-xs font-semibold bg-amber-900 text-white rounded-md"
            >
              {verifySent ? 'Verification Email Sent' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
