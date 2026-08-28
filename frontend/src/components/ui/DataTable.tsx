import { useMemo, useState, type ReactNode } from 'react'
import { EmptyState, LoadingState } from '@/components/ui'
import { Icons } from '@/components/ui/icons'
import { useLocale } from '@/context/LocaleContext'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  loading?: boolean
  searchPlaceholder?: string
  searchKeys?: (row: T) => string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  rowKey: (row: T) => string
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  searchPlaceholder,
  searchKeys,
  pageSize = 8,
  emptyTitle,
  emptyDescription,
  rowKey,
}: DataTableProps<T>) {
  const { t } = useLocale()
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.search')
  const resolvedEmptyTitle = emptyTitle ?? t('empty.noData')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let rows = [...data]
    if (query.trim() && searchKeys) {
      const q = query.toLowerCase()
      rows = rows.filter((row) => searchKeys(row).toLowerCase().includes(q))
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      if (col?.sortValue) {
        rows.sort((a, b) => {
          const av = col.sortValue!(a)
          const bv = col.sortValue!(b)
          const cmp = av < bv ? -1 : av > bv ? 1 : 0
          return sortDir === 'asc' ? cmp : -cmp
        })
      }
    }
    return rows
  }, [data, query, searchKeys, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function toggleSort(key: string, sortable?: boolean) {
    if (!sortable) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="datatable">
      {searchKeys && (
        <div className="datatable-toolbar">
          <div className="search-input-wrap">
            {Icons.search}
            <input
              className="input search-input"
              placeholder={resolvedSearchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <span className="datatable-count">
            {filtered.length} {t('pagination.records')}
          </span>
        </div>
      )}

      {paged.length === 0 ? (
        <EmptyState title={resolvedEmptyTitle} description={emptyDescription} icon={Icons.empty} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={col.sortable ? 'sortable' : undefined}
                      onClick={() => toggleSort(col.key, col.sortable)}
                    >
                      <span>{col.header}</span>
                      {col.sortable && sortKey === col.key && (
                        <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={rowKey(row)}>
                    {columns.map((col) => (
                      <td key={col.key}>{col.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > pageSize && (
            <div className="datatable-pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('common.prev')}
              </button>
              <span>
                {t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
