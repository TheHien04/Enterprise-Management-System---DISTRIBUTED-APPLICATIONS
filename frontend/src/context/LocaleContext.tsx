import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { messages, type Locale, type MessageKey } from '@/i18n/messages'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)
const STORAGE_KEY = 'udpt_locale'

function loadLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en') return 'en'
  return 'vi'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale)

  const setLocale = (next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLocaleState(next)
  }

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => messages[locale][key] ?? messages.en[key],
  }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
