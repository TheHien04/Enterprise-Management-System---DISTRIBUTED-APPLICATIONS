import { Link, useNavigate, useParams } from 'react-router-dom'
import { contractsApi, workflowsApi } from '@/api/modules'
import { useAsync } from '@/hooks/useAsync'
import { useLocale } from '@/context/LocaleContext'
import { DetailSkeleton, PageHeader, StatusBadge } from '@/components/ui'
import WorkflowTimeline from '@/components/ui/WorkflowTimeline'
import { Icons } from '@/components/ui/icons'
import type { Appendix, Contract } from '@/types/domain'

async function resolveAppendix(id: string): Promise<{ appendix: Appendix; contract?: Contract }> {
  try {
    const appendix = (await contractsApi.getAppendix(id)).data
    const contracts = (await contractsApi.list()).data
    const contract = contracts.find((c) => c.id === appendix.contract_id)
    return { appendix, contract }
  } catch {
    const contracts = (await contractsApi.list()).data
    for (const contract of contracts) {
      const appendices = (await contractsApi.listAppendices(contract.id)).data
      const found = appendices.find((a) => a.id === id)
      if (found) return { appendix: found, contract }
    }
    throw new Error('Appendix not found')
  }
}

export default function AppendixDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLocale()

  const resolved = useAsync(async () => resolveAppendix(id!), [id])
  const history = useAsync(
    async () => (await workflowsApi.documentHistory('APPENDIX', id!)).data,
    [id],
  )

  if (resolved.loading) return <DetailSkeleton />
  if (resolved.error || !resolved.data) {
    return (
      <div>
        <PageHeader title={t('error.appendixNotFound')} subtitle={resolved.error ?? t('error.invalidId')} />
        <button className="btn btn-secondary" onClick={() => navigate('/appendices')}>
          {Icons.arrowLeft} {t('detail.backToAppendices')}
        </button>
      </div>
    )
  }

  const { appendix, contract } = resolved.data

  return (
    <div className="page-enter">
      <Link to="/appendices" className="back-link">
        {Icons.arrowLeft} {t('detail.backToAppendices')}
      </Link>

      <PageHeader
        eyebrow={t('uc.contractAmendments')}
        title={appendix.code}
        subtitle={appendix.title || t('page.appendixDetail.subtitle')}
      />

      <div className="detail-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{t('card.appendixInfo')}</h3>
          </div>
          <dl className="detail-list">
            <div><dt>{t('detail.status')}</dt><dd><StatusBadge status={appendix.status} /></dd></div>
            <div>
              <dt>{t('col.contract')}</dt>
              <dd>
                {contract ? (
                  <Link to={`/contracts/${contract.id}`} className="link-primary cell-mono">
                    {contract.code}
                  </Link>
                ) : (
                  appendix.contract_id
                )}
              </dd>
            </div>
            <div><dt>{t('form.effectiveDate')}</dt><dd>{appendix.effective_date}</dd></div>
            <div><dt>{t('form.changeSummary')}</dt><dd>{appendix.change_summary ?? t('common.none')}</dd></div>
            <div><dt>{t('detail.workflowId')}</dt><dd className="cell-mono">{appendix.workflow_id?.slice(0, 8) ?? t('common.none')}…</dd></div>
          </dl>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('workflow.timelineTitle')}</h3>
              <p className="card-subtitle">{t('workflow.timelineSubtitle')}</p>
            </div>
          </div>
          {history.loading ? <DetailSkeleton /> : <WorkflowTimeline logs={history.data ?? []} />}
        </div>
      </div>
    </div>
  )
}
