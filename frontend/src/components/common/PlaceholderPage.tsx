interface PlaceholderPageProps {
  title: string
  subtitle: string
  items?: string[]
}

export default function PlaceholderPage({ title, subtitle, items = [] }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
      <div className="card">
        <p>Module scaffold ready — connect to API Gateway routes.</p>
        {items.length > 0 && (
          <ul>
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}
