import { adminApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { PageHeader, TableSkeleton } from '@/components/ui'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable'
import { interpolate } from '@/i18n/messages'
import type { AdminUser, AdminWorkflowTemplate } from '@/types/domain'

export default function AdminPage() {
  const { t } = useLocale()
  const users = useAsync(async () => (await adminApi.listUsers()).data, [])
  const roles = useAsync(async () => (await adminApi.listRoles()).data, [])
  const templates = useAsync(async () => (await adminApi.listWorkflowTemplates()).data, [])

  const userColumns: DataTableColumn<AdminUser>[] = [
    {
      key: 'username',
      header: t('form.username'),
      sortable: true,
      sortValue: (r) => r.username,
      render: (r) => <span className="cell-mono">{r.username}</span>,
    },
    {
      key: 'name',
      header: t('col.name'),
      sortable: true,
      sortValue: (r) => r.full_name,
      render: (r) => r.full_name,
    },
    {
      key: 'roles',
      header: t('admin.rolesTitle'),
      render: (r) =>
        r.roles.map((role) => (
          <span key={role} className="badge badge-neutral" style={{ marginRight: 6 }}>
            {role.replace(/_/g, ' ')}
          </span>
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

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('admin.userDirectory')}</h3>
            <p className="card-subtitle">
              {interpolate(t('admin.userDirectoryCount'), { count: users.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {users.error && <div className="alert alert-error">{users.error}</div>}
        {users.loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <DataTable
            columns={userColumns}
            data={users.data ?? []}
            rowKey={(r) => r.username}
            searchKeys={(r) => `${r.username} ${r.full_name} ${r.roles.join(' ')}`}
            searchPlaceholder={t('common.search')}
            emptyTitle={t('common.noResults')}
            emptyDescription={t('empty.noData')}
          />
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('admin.rolesTitle')}</h3>
            <p className="card-subtitle">
              {interpolate(t('admin.rolesSubtitle'), { count: roles.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {roles.error && <div className="alert alert-error">{roles.error}</div>}
        {roles.loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '0 20px 20px' }}>
            {(roles.data ?? []).map((role) => (
              <span key={role} className="badge badge-neutral">
                {role.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">{t('admin.workflowTemplatesTitle')}</h3>
            <p className="card-subtitle">
              {interpolate(t('admin.workflowTemplatesSubtitle'), { count: templates.data?.length ?? 0 })}
            </p>
          </div>
        </div>
        {templates.error && <div className="alert alert-error">{templates.error}</div>}
        {templates.loading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(templates.data ?? []).map((tpl: AdminWorkflowTemplate) => (
              <div
                key={tpl.document_type}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>{tpl.name}</p>
                    {tpl.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {tpl.description}
                      </p>
                    )}
                  </div>
                  <span className="badge badge-neutral">{tpl.document_type.replace(/_/g, ' ')}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '12px 0 8px', color: 'var(--text-muted)' }}>
                  {t('admin.steps')} ({tpl.steps.length})
                </p>
                <ol className="flow-steps" style={{ margin: 0 }}>
                  {tpl.steps.map((step) => (
                    <li key={step.step_num} className="flow-step">
                      <span className="flow-step-num">{step.step_num}</span>
                      <div>
                        <p className="flow-step-title">{step.step_name}</p>
                        <p className="flow-step-desc">{step.assignee_role.replace(/_/g, ' ')}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
