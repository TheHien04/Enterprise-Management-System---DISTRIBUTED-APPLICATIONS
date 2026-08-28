import { PageHeader } from '@/components/ui'
import { Icons } from '@/components/ui/icons'

interface PlaceholderPageProps {
  title: string
  subtitle: string
  items?: string[]
}

export default function PlaceholderPage({ title, subtitle, items = [] }: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader eyebrow="Coming soon" title={title} subtitle={subtitle} />
      <div className="card card-muted">
        <div className="empty-state" style={{ padding: '32px 24px' }}>
          <div className="empty-state-icon">{Icons.admin}</div>
          <p className="empty-state-title">Module scaffold ready</p>
          <p className="empty-state-text">Connect to API Gateway routes to enable full functionality.</p>
          {items.length > 0 && (
            <ul className="flow-steps" style={{ marginTop: 24, textAlign: 'left', width: '100%', maxWidth: 400 }}>
              {items.map((item, index) => (
                <li key={item} className="flow-step">
                  <span className="flow-step-num">{index + 1}</span>
                  <div>
                    <p className="flow-step-desc">{item}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
