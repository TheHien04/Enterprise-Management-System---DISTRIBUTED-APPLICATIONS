import { Link, useLocation } from 'react-router-dom'
import { defaultHomePath } from '@/config/rbac'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { Icons } from '@/components/ui/icons'

export default function ForbiddenPage() {
  const { hasRole } = useAuth()
  const { t } = useLocale()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  return (
    <div className="page-enter">
      <div className="card" style={{ maxWidth: 560, margin: '48px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.85 }}>403</div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>{t('error.forbiddenTitle')}</h1>
        <p className="page-subtitle" style={{ marginBottom: 20 }}>
          {t('error.forbiddenSubtitle')}
        </p>
        {from && (
          <p className="text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
            {from}
          </p>
        )}
        <Link to={defaultHomePath(hasRole)} className="btn">
          {Icons.arrowLeft}
          {t('error.backToHome')}
        </Link>
      </div>
    </div>
  )
}
