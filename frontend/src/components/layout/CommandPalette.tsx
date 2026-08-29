import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { contractsApi, customersApi } from '@/api/modules'
import { NAV_SECTIONS } from '@/config/rbac'
import { useAuth } from '@/context/AuthContext'
import { useLocale } from '@/context/LocaleContext'
import { Icons } from '@/components/ui/icons'
import { getRecentEntities } from '@/lib/recentEntities'
import type { Contract, Customer } from '@/types/domain'

type PaletteItem = {
  id: string
  label: string
  hint?: string
  to: string
  group: string
}

type ShortcutRow = { keys: string; label: string }

export default function CommandPalette({
  open,
  onClose,
  startWithHelp = false,
}: {
  open: boolean
  onClose: () => void
  startWithHelp?: boolean
}) {
  const { hasRole } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recent, setRecent] = useState(getRecentEntities())
  const [activeIndex, setActiveIndex] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
      setShowHelp(false)
      return
    }
    setShowHelp(startWithHelp)
    setRecent(getRecentEntities())
    if (!startWithHelp) inputRef.current?.focus()
    let cancelled = false
    ;(async () => {
      try {
        if (hasRole('SALES_STAFF', 'SALES_MANAGER', 'LEGAL', 'DIRECTOR', 'ADMIN')) {
          const res = await contractsApi.list()
          if (!cancelled) setContracts((res.data ?? []).slice(0, 12))
        }
      } catch {
        /* ignore — palette still works with pages */
      }
      try {
        if (hasRole('SALES_STAFF', 'SALES_MANAGER', 'ADMIN')) {
          const res = await customersApi.list()
          if (!cancelled) setCustomers((res.data ?? []).slice(0, 12))
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, hasRole, startWithHelp])

  const shortcuts: ShortcutRow[] = [
    { keys: '⌘K / Ctrl+K', label: t('cmd.shortcut.palette') },
    { keys: '?', label: t('cmd.shortcut.help') },
    { keys: 'G then A', label: t('cmd.shortcut.approvals') },
    { keys: 'G then E', label: t('cmd.shortcut.exceptions') },
    { keys: 'G then D', label: t('cmd.shortcut.dashboard') },
    { keys: 'Esc', label: t('cmd.shortcut.escape') },
  ]

  const items = useMemo(() => {
    const pages: PaletteItem[] = NAV_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => item.roles === null || item.roles.some((role) => hasRole(role)))
        .map((item) => ({
          id: `page-${item.to}`,
          label: t(item.labelKey),
          hint: t(section.labelKey),
          to: item.to,
          group: t('cmd.pages'),
        })),
    )

    const recentItems: PaletteItem[] = recent.map((r) => ({
      id: `recent-${r.type}-${r.id}`,
      label: r.label,
      hint: r.hint,
      to: r.to,
      group: t('cmd.recent'),
    }))

    const recentContracts: PaletteItem[] = contracts.map((c) => ({
      id: `contract-${c.id}`,
      label: c.code,
      hint: c.customer_name ?? c.title ?? c.status,
      to: `/contracts/${c.id}`,
      group: t('cmd.contracts'),
    }))

    const recentCustomers: PaletteItem[] = customers.map((c) => ({
      id: `customer-${c.id}`,
      label: `${c.code} — ${c.name}`,
      hint: c.status,
      to: `/customers/${c.id}`,
      group: t('cmd.customers'),
    }))

    const helpItem: PaletteItem = {
      id: 'help-shortcuts',
      label: t('cmd.shortcuts'),
      hint: '?',
      to: '__help__',
      group: t('cmd.pages'),
    }

    const all = [helpItem, ...pages, ...recentItems, ...recentContracts, ...recentCustomers]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.hint ?? '').toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q),
    )
  }, [contracts, customers, hasRole, query, recent, t])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open, showHelp])

  function go(item: PaletteItem) {
    if (item.to === '__help__') {
      setShowHelp(true)
      return
    }
    navigate(item.to)
    onClose()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (showHelp) {
        setShowHelp(false)
        return
      }
      onClose()
      return
    }
    if (event.key === '?' && !showHelp && query === '') {
      event.preventDefault()
      setShowHelp(true)
      return
    }
    if (showHelp) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault()
      go(items[activeIndex])
    }
  }

  if (!open) return null

  let lastGroup = ''

  return (
    <div className="cmd-overlay" role="dialog" aria-modal="true" aria-label={t('cmd.title')} onClick={onClose}>
      <div className="cmd-panel" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        {showHelp ? (
          <>
            <div className="cmd-search">
              {Icons.infoCircle}
              <span className="cmd-help-title">{t('cmd.shortcutsTitle')}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHelp(false)}>
                {t('cmd.backToSearch')}
              </button>
            </div>
            <ul className="cmd-shortcuts">
              {shortcuts.map((row) => (
                <li key={row.keys} className="cmd-shortcut-row">
                  <kbd className="cmd-kbd">{row.keys}</kbd>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
            <div className="cmd-footer">
              <span>{t('cmd.hint')}</span>
            </div>
          </>
        ) : (
          <>
            <div className="cmd-search">
              {Icons.search}
              <input
                ref={inputRef}
                className="cmd-input"
                placeholder={t('cmd.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-autocomplete="list"
              />
              <kbd className="cmd-kbd">esc</kbd>
            </div>
            <div className="cmd-list" role="listbox">
              {items.length === 0 ? (
                <p className="cmd-empty">{t('common.noResults')}</p>
              ) : (
                items.map((item, index) => {
                  const showGroup = item.group !== lastGroup
                  lastGroup = item.group
                  return (
                    <div key={item.id}>
                      {showGroup && <div className="cmd-group">{item.group}</div>}
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        className={`cmd-item${index === activeIndex ? ' active' : ''}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(item)}
                      >
                        <span className="cmd-item-label">{item.label}</span>
                        {item.hint && <span className="cmd-item-hint">{item.hint}</span>}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            <div className="cmd-footer">
              <span>{t('cmd.hint')}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
