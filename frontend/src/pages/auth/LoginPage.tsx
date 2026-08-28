import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import '@/components/layout/AppLayout.css'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('sale01')
  const [password, setPassword] = useState('sale01')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1 className="page-title">UDPT Login</h1>
        <p className="page-subtitle">Enterprise Business Management System</p>
        <form onSubmit={handleSubmit}>
          <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <div className="hint">Demo: sale01 / sale01 · manager01 / manager01 · director01 / director01</div>
      </div>
    </div>
  )
}
