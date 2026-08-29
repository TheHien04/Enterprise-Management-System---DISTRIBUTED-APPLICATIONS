export type RecentEntity = {
  id: string
  type: 'contract' | 'customer' | 'billing'
  label: string
  hint?: string
  to: string
  visitedAt: number
}

const STORAGE_KEY = 'udpt.recentEntities'
const MAX_ITEMS = 8

function readAll(): RecentEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentEntity[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items: RecentEntity[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getRecentEntities(): RecentEntity[] {
  return readAll().sort((a, b) => b.visitedAt - a.visitedAt)
}

export function trackRecentEntity(entry: Omit<RecentEntity, 'visitedAt'>) {
  const next = [
    { ...entry, visitedAt: Date.now() },
    ...readAll().filter((item) => !(item.type === entry.type && item.id === entry.id)),
  ]
  writeAll(next)
}
