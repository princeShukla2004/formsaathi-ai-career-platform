import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  FileEdit,
  Flag,
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquarePlus,
  Moon,
  PlusCircle,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Admin Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/jobs', label: 'Job Management', icon: Briefcase },
  { to: '/admin/jobs/new', label: 'Add New Job', icon: PlusCircle },
  { to: '/admin/verification', label: 'Job Verification', icon: CheckSquare },
  { to: '/admin/exam-calendar', label: 'Exam Calendar', icon: CalendarDays },
  { to: '/admin/mock-tests', label: 'Mock Tests & Bank', icon: ClipboardCheck },
  { to: '/admin/learning-hub', label: 'Learning Hub', icon: BookOpen },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/reports', label: 'Reported Jobs', icon: Flag },
  { to: '/admin/feedback', label: 'User Feedback', icon: MessageSquarePlus },
  { to: '/admin/categories', label: 'Categories', icon: FolderKanban },
  { to: '/admin/ai-analytics', label: 'AI Usage Analytics', icon: Activity },
  { to: '/admin/content', label: 'Content Management', icon: FileEdit },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/analytics', label: 'Platform Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Admin Settings', icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B1320] text-[#172033] dark:text-slate-100">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col border-r border-[#E2E8F0] dark:border-slate-800 bg-[#14243A] text-white shrink-0">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-700/60">
          <Link to="/admin" className="text-base font-bold tracking-tight text-white">
            FormSaathi Admin
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#14B8A6] text-[#14243A]'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700/60 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-lg"
          >
            <Home className="w-4 h-4" />
            <span>Candidate View</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-full bg-[#14243A] text-white h-full flex flex-col z-10">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-700/60">
              <span className="font-bold">FormSaathi Admin</span>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {ADMIN_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg ${
                        isActive ? 'bg-[#14B8A6] text-[#14243A]' : 'text-slate-300'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#131E30] border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm text-[#64748B] dark:text-slate-400 truncate">
              Verified Admin Console · {user?.email}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
            >
              Public Site
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
