import { useEffect } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { LoadingState } from '../common/LoadingState'
import { MobileFloatingNotifications } from '../layout/MobileFloatingNotifications'
import { useLangRefresh } from '../../hooks/useLangRefresh'
import { DispatcherSessionProvider } from '../../hooks/useDispatcherSession'
import { DispatchSnapshotProvider } from '../../hooks/useDispatchSnapshot'
import { strings } from '../../i18n/strings'
import { DispatchMobileNav } from './DispatchMobileNav'
import { DispatchTopBar } from './DispatchTopBar'
import type { DispatcherOutletContext } from '../../types/appContext'

export function DispatcherAppShell() {
  useLangRefresh()
  const t = strings()
  const session = useOutletContext<DispatcherOutletContext | null>()

  useEffect(() => {
    document.body.classList.add('app-mobile-nav', 'app-dispatch-shell')
    return () => {
      document.body.classList.remove('app-mobile-nav', 'app-dispatch-shell')
    }
  }, [])

  if (!session?.me) {
    return (
      <div className="app-shell-atmosphere min-h-screen">
        <LoadingState />
      </div>
    )
  }

  const { me } = session

  return (
    <DispatcherSessionProvider value={{ me }}>
      <DispatchSnapshotProvider accountId={me.account.id}>
        <div className="app-shell-atmosphere min-h-screen pb-24 lg:pb-6">
          <div className="pointer-events-none fixed bottom-2 left-2 z-50">
            <span className="rounded-full border border-brand-navy/15 bg-brand-navy px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
              {t.common.appVersionBadge}
            </span>
          </div>
          <DispatchTopBar
            accountId={me.account.id}
            name={me.dispatcherProfile.fullName}
            roleLevel={me.dispatcherProfile.roleLevel}
          />
          <MobileFloatingNotifications accountId={me.account.id} appRole="dispatcher" />
          <main className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
          <DispatchMobileNav />
        </div>
      </DispatchSnapshotProvider>
    </DispatcherSessionProvider>
  )
}
