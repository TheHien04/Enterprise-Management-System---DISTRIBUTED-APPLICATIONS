import { adminApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import type { AdminUser } from '@/types/domain'

export default function AdminPage() {
  const { t } = useLocale()
  const users = useAsync(async () => (await adminApi.listUsers()).data, [])

  const columns: DataTableColumn<AdminUser>[] = [
    { key: 'username', header: 'Username', sortable: true, sortValue: (r) => r.username, render: (r) => <span className="cell-mono">{r.username}</span> },
    { key: 'name', header: 'Full name', sortable: true, sortValue: (r) => r.full_name, render: (r) => r.full_name },
    {
      key: 'roles',
      header: 'Roles',
      render: (r) => r.roles.map((role) => (
        <span key={role} className="badge badge-neutral" style={{ marginRight: 6 }}>{role.replace(/_/g, ' ')}</span>
      )),
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="UC-11 · Platform admin"
        title={t('page.admin.title')}
        subtitle={t('page.admin.subtitle')}
      />

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">User directory</h3>
            <p className="card-subtitle">{users.data?.length ?? 0} registered demo users</p>
          </div>
        </div>
        {users.error && <div className="alert alert-error">{users.error}</div>}
        {users.loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <DataTable
            columns={columns}
            data={users.data ?? []}
            rowKey={(r) => r.username}
            searchKeys={(r) => `${r.username} ${r.full_name} ${r.roles.join(' ')}`}
            searchPlaceholder="Search users…"
            emptyTitle="No users found"
            emptyDescription="User accounts will appear here when configured."
          />
        )}
      </div>
    </div>
  )
}
