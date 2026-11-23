import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/layouts/AdminLayout';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AuthProvider } from './context/AuthContext';
import { CompareProvider } from './context/CompareContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';

// Public & Auth Pages (Core immediate routes)
import { AboutPage } from './pages/public/AboutPage';
import { AICareerAssistantPage } from './pages/public/AICareerAssistantPage';
import { CareerResourcesPage } from './pages/public/CareerResourcesPage';
import { ContactPage } from './pages/public/ContactPage';
import { EligibilityCheckerPage } from './pages/public/EligibilityCheckerPage';
import { HelpCenterPage } from './pages/public/HelpCenterPage';
import { HomePage } from './pages/public/HomePage';
import { JobDetailPage } from './pages/public/JobDetailPage';
import { JobsExplorePage } from './pages/public/JobsExplorePage';
import { PrivacyPolicyPage, TermsPage } from './pages/public/LegalPages';
import { PricingPage } from './pages/public/PricingPage';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/auth/AuthPages';

// Lazy-loaded Heavy Tools, Candidate Dashboard & Admin Console
const ResumeStudioPage = lazy(() =>
  import('./pages/public/ResumeStudioPage').then((m) => ({ default: m.ResumeStudioPage }))
);
const ResumeAnalyzerPage = lazy(() =>
  import('./pages/tools/ResumeAnalyzerPage').then((m) => ({ default: m.ResumeAnalyzerPage }))
);
const MockInterviewPage = lazy(() =>
  import('./pages/tools/MockInterviewPage').then((m) => ({ default: m.MockInterviewPage }))
);
const MockTestsPage = lazy(() =>
  import('./pages/tools/MockTestsPage').then((m) => ({ default: m.MockTestsPage }))
);
const CareerRoadmapPage = lazy(() =>
  import('./pages/tools/CareerRoadmapPage').then((m) => ({ default: m.CareerRoadmapPage }))
);
const FormAssistantPage = lazy(() =>
  import('./pages/tools/FormAssistantPage').then((m) => ({ default: m.FormAssistantPage }))
);
const ExamCalendarPage = lazy(() =>
  import('./pages/tools/ExamCalendarPage').then((m) => ({ default: m.ExamCalendarPage }))
);
const PhotoResizerPage = lazy(() =>
  import('./pages/tools/PhotoResizerPage').then((m) => ({ default: m.PhotoResizerPage }))
);
const LearningHubPage = lazy(() =>
  import('./pages/tools/LearningHubPage').then((m) => ({ default: m.LearningHubPage }))
);
const CompareJobsPage = lazy(() =>
  import('./pages/tools/CompareJobsPage').then((m) => ({ default: m.CompareJobsPage }))
);

// Candidate Dashboard Pages
const AccountSecurityPage = lazy(() =>
  import('./pages/dashboard/AccountSecurityPage').then((m) => ({ default: m.AccountSecurityPage }))
);
const AIHistoryPage = lazy(() =>
  import('./pages/dashboard/AIHistoryPage').then((m) => ({ default: m.AIHistoryPage }))
);
const ApplicationsPage = lazy(() =>
  import('./pages/dashboard/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage }))
);
const DashboardOverviewPage = lazy(() =>
  import('./pages/dashboard/DashboardOverviewPage').then((m) => ({ default: m.DashboardOverviewPage }))
);
const DocumentChecklistPage = lazy(() =>
  import('./pages/dashboard/DocumentChecklistPage').then((m) => ({ default: m.DocumentChecklistPage }))
);
const EligibilityHistoryPage = lazy(() =>
  import('./pages/dashboard/EligibilityHistoryPage').then((m) => ({ default: m.EligibilityHistoryPage }))
);
const JobAlertsPage = lazy(() =>
  import('./pages/dashboard/JobAlertsPage').then((m) => ({ default: m.JobAlertsPage }))
);
const NotificationsPage = lazy(() =>
  import('./pages/dashboard/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const ProfileSettingsPage = lazy(() =>
  import('./pages/dashboard/ProfileSettingsPage').then((m) => ({ default: m.ProfileSettingsPage }))
);
const RecommendedJobsPage = lazy(() =>
  import('./pages/dashboard/RecommendedJobsPage').then((m) => ({ default: m.RecommendedJobsPage }))
);
const ResumeManagerPage = lazy(() =>
  import('./pages/dashboard/ResumeManagerPage').then((m) => ({ default: m.ResumeManagerPage }))
);
const SavedJobsPage = lazy(() =>
  import('./pages/dashboard/SavedJobsPage').then((m) => ({ default: m.SavedJobsPage }))
);
const SubscriptionSettingsPage = lazy(() =>
  import('./pages/dashboard/SubscriptionSettingsPage').then((m) => ({
    default: m.SubscriptionSettingsPage,
  }))
);

// Admin Dashboard Pages
const AdminAIAnalyticsPage = lazy(() =>
  import('./pages/admin/AdminAIAnalyticsPage').then((m) => ({ default: m.AdminAIAnalyticsPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage }))
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage }))
);
const AdminContentPage = lazy(() =>
  import('./pages/admin/AdminContentPage').then((m) => ({ default: m.AdminContentPage }))
);
const AdminExamCalendarPage = lazy(() =>
  import('./pages/admin/AdminExamCalendarPage').then((m) => ({ default: m.AdminExamCalendarPage }))
);
const AdminFeedbackPage = lazy(() =>
  import('./pages/admin/AdminFeedbackPage').then((m) => ({ default: m.AdminFeedbackPage }))
);
const AdminJobFormPage = lazy(() =>
  import('./pages/admin/AdminJobFormPage').then((m) => ({ default: m.AdminJobFormPage }))
);
const AdminJobsPage = lazy(() =>
  import('./pages/admin/AdminJobsPage').then((m) => ({ default: m.AdminJobsPage }))
);
const AdminLearningHubPage = lazy(() =>
  import('./pages/admin/AdminLearningHubPage').then((m) => ({ default: m.AdminLearningHubPage }))
);
const AdminMockTestsPage = lazy(() =>
  import('./pages/admin/AdminMockTestsPage').then((m) => ({ default: m.AdminMockTestsPage }))
);
const AdminNotificationsPage = lazy(() =>
  import('./pages/admin/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage }))
);
const AdminOverviewPage = lazy(() =>
  import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminVerificationPage = lazy(() =>
  import('./pages/admin/AdminVerificationPage').then((m) => ({ default: m.AdminVerificationPage }))
);

function RouteLoadingFallback() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 space-y-4">
      <div className="h-8 w-56 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      <div className="h-56 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <p className="text-xs font-mono-num uppercase tracking-wider text-[#0D9488]">404 · Page Not Found</p>
      <h1 className="text-3xl font-bold text-[#14243A] dark:text-white">
        This page could not be found
      </h1>
      <p className="text-sm text-[#64748B] dark:text-slate-400">
        The link may have moved or the job listing URL is no longer active. Explore verified opportunities from the catalog below.
      </p>
      <div className="pt-2 flex justify-center gap-3">
        <Link
          to="/"
          className="px-4 py-2 text-sm font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          Back to Home
        </Link>
        <Link
          to="/jobs"
          className="px-4 py-2 text-sm font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
        >
          Explore Jobs
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CompareProvider>
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Routes>
                    {/* Public Website & Career Tools */}
                    <Route element={<PublicLayout />}>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/jobs" element={<JobsExplorePage />} />
                      <Route
                        path="/jobs/government"
                        element={
                          <JobsExplorePage
                            defaultSector="government"
                            pageTitle="Government Jobs"
                            pageSubtitle="Verified central & state civil services, SSC, banking, railway, and PSU recruitment portals."
                          />
                        }
                      />
                      <Route
                        path="/jobs/private"
                        element={
                          <JobsExplorePage
                            defaultSector="private"
                            pageTitle="Private Sector Jobs"
                            pageSubtitle="Official campus drives, technology, engineering, and corporate openings from verified employer portals."
                          />
                        }
                      />
                      <Route
                        path="/jobs/internships"
                        element={
                          <JobsExplorePage
                            defaultSector="internship"
                            pageTitle="Internship Opportunities"
                            pageSubtitle="AICTE-listed, research, PSU, and technology internships for students and fresh graduates."
                          />
                        }
                      />
                      <Route path="/jobs/:id" element={<JobDetailPage />} />
                      <Route path="/eligibility" element={<EligibilityCheckerPage />} />
                      <Route path="/eligibility/:jobId" element={<EligibilityCheckerPage />} />
                      <Route path="/assistant" element={<AICareerAssistantPage />} />
                      <Route path="/resume-studio" element={<ResumeStudioPage />} />

                      {/* FormSaathi 2.0 Public Career Tools */}
                      <Route path="/tools/resume-analyzer" element={<ResumeAnalyzerPage />} />
                      <Route path="/tools/mock-interview" element={<MockInterviewPage />} />
                      <Route path="/tools/mock-tests" element={<MockTestsPage />} />
                      <Route path="/tools/career-roadmap" element={<CareerRoadmapPage />} />
                      <Route path="/tools/form-assistant" element={<FormAssistantPage />} />
                      <Route path="/tools/exam-calendar" element={<ExamCalendarPage />} />
                      <Route path="/tools/photo-resizer" element={<PhotoResizerPage />} />
                      <Route path="/tools/learning-hub" element={<LearningHubPage />} />
                      <Route path="/tools/compare-jobs" element={<CompareJobsPage />} />

                      <Route path="/resources" element={<CareerResourcesPage />} />
                      <Route path="/pricing" element={<PricingPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/help" element={<HelpCenterPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>

                    {/* Authenticated Candidate Dashboard */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<DashboardOverviewPage />} />
                      <Route path="recommended" element={<RecommendedJobsPage />} />
                      <Route path="job-alerts" element={<JobAlertsPage />} />
                      <Route path="saved" element={<SavedJobsPage />} />
                      <Route path="applications" element={<ApplicationsPage />} />
                      <Route path="eligibility" element={<EligibilityHistoryPage />} />
                      <Route path="resumes" element={<ResumeManagerPage />} />
                      <Route path="resume-analyzer" element={<ResumeAnalyzerPage />} />
                      <Route path="mock-interview" element={<MockInterviewPage />} />
                      <Route path="mock-tests" element={<MockTestsPage />} />
                      <Route path="career-roadmap" element={<CareerRoadmapPage />} />
                      <Route path="exam-calendar" element={<ExamCalendarPage />} />
                      <Route path="learning-hub" element={<LearningHubPage />} />
                      <Route path="form-assistant" element={<FormAssistantPage />} />
                      <Route path="ai-history" element={<AIHistoryPage />} />
                      <Route path="documents" element={<DocumentChecklistPage />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="profile" element={<ProfileSettingsPage />} />
                      <Route path="security" element={<AccountSecurityPage />} />
                      <Route path="subscription" element={<SubscriptionSettingsPage />} />
                    </Route>

                    {/* Admin Dashboard */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<AdminOverviewPage />} />
                      <Route path="jobs" element={<AdminJobsPage />} />
                      <Route path="jobs/new" element={<AdminJobFormPage />} />
                      <Route path="jobs/:id/edit" element={<AdminJobFormPage />} />
                      <Route path="verification" element={<AdminVerificationPage />} />
                      <Route path="exam-calendar" element={<AdminExamCalendarPage />} />
                      <Route path="mock-tests" element={<AdminMockTestsPage />} />
                      <Route path="learning-hub" element={<AdminLearningHubPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="reports" element={<AdminReportsPage />} />
                      <Route path="feedback" element={<AdminFeedbackPage />} />
                      <Route path="categories" element={<AdminCategoriesPage />} />
                      <Route path="ai-analytics" element={<AdminAIAnalyticsPage />} />
                      <Route path="content" element={<AdminContentPage />} />
                      <Route path="notifications" element={<AdminNotificationsPage />} />
                      <Route path="analytics" element={<AdminAnalyticsPage />} />
                      <Route path="settings" element={<AdminSettingsPage />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </CompareProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
