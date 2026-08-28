import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { defaultHomePath } from '@/config/rbac'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { Icons } from '@/components/ui/icons'
import type { UserRole } from '@/types/auth'

const DEMO_ACCOUNTS: { username: string; role: UserRole; labelKey: 'login.demoSales' | 'login.demoManager' | 'login.demoLegal' | 'login.demoAccounting' | 'login.demoOperations' | 'login.demoDirector' | 'login.demoAdmin' }[] = [
  { username: 'sale01', role: 'SALES_STAFF', labelKey: 'login.demoSales' },
  { username: 'manager01', role: 'SALES_MANAGER', labelKey: 'login.demoManager' },
  { username: 'legal01', role: 'LEGAL', labelKey: 'login.demoLegal' },
  { username: 'ops01', role: 'OPERATIONS', labelKey: 'login.demoOperations' },
  { username: 'account01', role: 'ACCOUNTING', labelKey: 'login.demoAccounting' },
  { username: 'director01', role: 'DIRECTOR', labelKey: 'login.demoDirector' },
  { username: 'admin01', role: 'ADMIN', labelKey: 'login.demoAdmin' },
]

export default function LoginPage() {
  const { login, isAuthenticated, hasRole } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [username, setUsername] = useState('sale01')
  const [password, setPassword] = useState('sale01')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={defaultHomePath(hasRole)} replace />
  }

  async function signInAs(demoUser: string) {
    setUsername(demoUser)
    setPassword(demoUser)
    setLoading(true)
    setError('')
    try {
      await login(demoUser, demoUser)
      const roleCheck = (...roles: UserRole[]) => DEMO_ACCOUNTS.find((a) => a.username === demoUser)?.role
        ? roles.includes(DEMO_ACCOUNTS.find((a) => a.username === demoUser)!.role)
        : false
      navigate(defaultHomePath(roleCheck), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loggedIn = await login(username, password)
      const roleCheck = (...roles: UserRole[]) => roles.some((r) => loggedIn.roles.includes(r))
      navigate(defaultHomePath(roleCheck), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <section className="login-hero">
        <div className="login-brand">
          <div className="login-brand-mark">
            <div className="login-brand-icon">{Icons.logo}</div>
            <div>
              <span className="login-brand-name">{t('brand.name')}</span>
              <span className="login-brand-tag">{t('login.brandTag')}</span>
            </div>
          </div>
        </div>

        <div className="login-hero-content">
          <h1>{t('login.heroTitle')}</h1>
          <p>{t('login.heroSubtitle')}</p>
        </div>

        <div className="login-hero-stats">
          <div>
            <span className="login-stat-value">8</span>
            <span className="login-stat-label">{t('login.statMicroservices')}</span>
          </div>
          <div>
            <span className="login-stat-value">5-step</span>
            <span className="login-stat-label">{t('login.statWorkflow')}</span>
          </div>
          <div>
            <span className="login-stat-value">100%</span>
            <span className="login-stat-label">{t('login.statAudit')}</span>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{t('login.signInTitle')}</h2>
            <p>{t('login.signInSubtitle')}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="username">{t('form.username')}</label>
              <input
                id="username"
                className="input"
                placeholder={t('login.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="form-field">
              <label htmlFor="password">{t('form.password')}</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('common.signingIn') : t('login.submitButton')}
            </button>
          </form>

          <div className="login-hint">
            <strong>{t('login.demoHint')}</strong>
            <p style={{ margin: '8px 0 4px', fontSize: 13 }}>{t('login.demoPasswordHint')}</p>
            <div className="login-demo-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="login-demo-chip"
                  disabled={loading}
                  onClick={() => signInAs(account.username)}
                >
                  <span className="login-demo-chip-user">{account.username}</span>
                  <span className="login-demo-chip-role">{t(account.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
