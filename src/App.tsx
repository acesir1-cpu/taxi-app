import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useMe } from './hooks/useMe'
import { AppShell } from './components/layout/AppShell'
import { DriverAppShell } from './components/driver/DriverAppShell'
import { DispatcherAppShell } from './components/dispatch/DispatcherAppShell'
import { LoadingState } from './components/common/LoadingState'
import { AuthMarketingLayout } from './components/auth/AuthMarketingLayout'
import { WelcomePage } from './pages/WelcomePage'
import { RegisterPage } from './pages/RegisterPage'
import { VerifyPage } from './pages/VerifyPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { SupportPage } from './pages/SupportPage'
import { TermsPage } from './pages/TermsPage'
import { OrderPage } from './pages/OrderPage'
import { SearchingPage } from './pages/SearchingPage'
import { RidePage } from './pages/RidePage'
import { RateRidePage } from './pages/RateRidePage'
import { HistoryPage } from './pages/HistoryPage'
import { HistoryDetailPage } from './pages/HistoryDetailPage'
import { ProblemPage } from './pages/ProblemPage'
import { ProfilePage } from './pages/ProfilePage'
import { ActiveRideRedirectPage } from './pages/ActiveRideRedirectPage'
import { NoDriverPage } from './pages/NoDriverPage'
import { ScheduledRidesPage } from './pages/ScheduledRidesPage'
import { DriverDashboardPage } from './pages/DriverDashboardPage'
import { DriverActiveRidePage } from './pages/DriverActiveRidePage'
import { DriverHistoryPage } from './pages/DriverHistoryPage'
import { DriverEarningsPage } from './pages/DriverEarningsPage'
import { DriverSettingsPage } from './pages/DriverSettingsPage'
import { AdminDriverPhotosPage } from './pages/AdminDriverPhotosPage'
import { PassengerDocumentPage } from './pages/PassengerDocumentPage'
import { DispatcherActivityPage } from './pages/DispatcherActivityPage'
import { DispatcherDashboardPage } from './pages/DispatcherDashboardPage'
import { DispatcherDriversPage } from './pages/DispatcherDriversPage'
import { DispatcherProblemsPage } from './pages/DispatcherProblemsPage'
import { DispatcherReportViewPage } from './pages/DispatcherReportViewPage'
import { DispatcherReportsPage } from './pages/DispatcherReportsPage'
import { DispatcherRideDetailPage } from './pages/DispatcherRideDetailPage'
import { DispatcherRidesPage } from './pages/DispatcherRidesPage'
import { DispatcherSettingsPage } from './pages/DispatcherSettingsPage'
import { DesignConsistencyPage } from './pages/DesignConsistencyPage'
import { FutureRoleDemoPage } from './pages/FutureRoleDemoPage'
import { NotFoundPage } from './pages/NotFoundPage'

function RootRedirect() {
  const { data, isLoading } = useMe()
  if (isLoading) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (!data) return <Navigate to="/welcome" replace />
  if (data.kind === 'driver') return <Navigate to="/driver" replace />
  if (data.kind === 'dispatcher') return <Navigate to="/dispatch" replace />
  return <Navigate to="/app/order" replace />
}

function GuestLayout() {
  const { data, isLoading } = useMe()
  if (isLoading) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (data?.kind === 'driver') return <Navigate to="/driver" replace />
  if (data?.kind === 'dispatcher') return <Navigate to="/dispatch" replace />
  if (data?.kind === 'passenger') return <Navigate to="/app/order" replace />
  return <Outlet />
}

function PassengerProtectedLayout() {
  const { data, isLoading } = useMe()
  if (isLoading) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (!data) return <NotFoundPage />
  if (data.kind === 'driver') return <Navigate to="/driver" replace />
  if (data.kind === 'dispatcher') return <Navigate to="/dispatch" replace />
  return <Outlet />
}

function DriverProtectedLayout() {
  const { data, isLoading } = useMe()
  if (isLoading) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (!data) return <NotFoundPage />
  if (data.kind === 'passenger') return <Navigate to="/app/order" replace />
  if (data.kind === 'dispatcher') return <Navigate to="/dispatch" replace />
  return <Outlet />
}

function DispatcherProtectedLayout() {
  const { data, isPending } = useMe()
  if (isPending && !data) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (!data) return <NotFoundPage />
  if (data.kind !== 'dispatcher') {
    if (data.kind === 'driver') return <Navigate to="/driver" replace />
    return <Navigate to="/app/order" replace />
  }
  return <Outlet context={{ me: data }} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/admin/vozaci-fotografije" element={<AdminDriverPhotosPage />} />
      <Route path="/dokaz-konzistentnosti" element={<DesignConsistencyPage />} />
      <Route path="/demo/menadzer" element={<FutureRoleDemoPage role="manager" />} />
      <Route path="/demo/poslovni-administrator" element={<FutureRoleDemoPage role="business-admin" />} />
      <Route path="/demo/it-administrator" element={<FutureRoleDemoPage role="it-admin" />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route element={<AuthMarketingLayout />}>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<GuestLayout />}>
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route element={<PassengerProtectedLayout />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/order" replace />} />
          <Route path="order" element={<OrderPage />} />
          <Route path="searching" element={<SearchingPage />} />
          <Route path="no-driver" element={<NoDriverPage />} />
          <Route path="ride/:id" element={<RidePage />} />
          <Route path="rate/:rideId" element={<RateRidePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="scheduled" element={<ScheduledRidesPage />} />
          <Route path="history/:id" element={<HistoryDetailPage />} />
          <Route path="documents/:docType/:entityId" element={<PassengerDocumentPage />} />
          <Route path="problem/:rideId" element={<ProblemPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="active" element={<ActiveRideRedirectPage />} />
        </Route>
      </Route>
      <Route element={<DriverProtectedLayout />}>
        <Route path="/driver" element={<DriverAppShell />}>
          <Route index element={<DriverDashboardPage />} />
          <Route path="active" element={<DriverActiveRidePage />} />
          <Route path="history" element={<DriverHistoryPage />} />
          <Route path="earnings" element={<DriverEarningsPage />} />
          <Route path="settings" element={<DriverSettingsPage />} />
        </Route>
      </Route>
      <Route element={<DispatcherProtectedLayout />}>
        <Route path="/dispatch" element={<DispatcherAppShell />}>
          <Route index element={<DispatcherDashboardPage />} />
          <Route path="rides" element={<DispatcherRidesPage />} />
          <Route path="rides/:id" element={<DispatcherRideDetailPage />} />
          <Route path="drivers" element={<DispatcherDriversPage />} />
          <Route path="problems" element={<DispatcherProblemsPage />} />
          <Route path="reports" element={<DispatcherReportsPage />} />
          <Route path="reports/:reportType" element={<DispatcherReportViewPage />} />
          <Route path="activity" element={<DispatcherActivityPage />} />
          <Route path="settings" element={<DispatcherSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
