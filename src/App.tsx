import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useMe } from './hooks/useMe'
import { AppShell } from './components/layout/AppShell'
import { LoadingState } from './components/common/LoadingState'
import { WelcomePage } from './pages/WelcomePage'
import { RegisterPage } from './pages/RegisterPage'
import { VerifyPage } from './pages/VerifyPage'
import { LoginPage } from './pages/LoginPage'
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

function RootRedirect() {
  const { data, isLoading } = useMe()
  if (isLoading) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  return <Navigate to={data ? '/app/order' : '/welcome'} replace />
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
  if (data) return <Navigate to="/app/order" replace />
  return <Outlet />
}

function ProtectedLayout() {
  const { data, isLoading } = useMe()
  if (isLoading) {
    return (
      <div className="app-shell-atmosphere flex min-h-screen items-center justify-center">
        <LoadingState />
      </div>
    )
  }
  if (!data) return <Navigate to="/welcome" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyPage />} />
      </Route>
      <Route element={<ProtectedLayout />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/order" replace />} />
          <Route path="order" element={<OrderPage />} />
          <Route path="searching" element={<SearchingPage />} />
          <Route path="no-driver" element={<NoDriverPage />} />
          <Route path="ride/:id" element={<RidePage />} />
          <Route path="rate/:rideId" element={<RateRidePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<HistoryDetailPage />} />
          <Route path="problem/:rideId" element={<ProblemPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="active" element={<ActiveRideRedirectPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
