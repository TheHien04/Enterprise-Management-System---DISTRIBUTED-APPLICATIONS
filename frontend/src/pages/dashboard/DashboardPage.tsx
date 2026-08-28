import PlaceholderPage from '@/components/common/PlaceholderPage'

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      subtitle="Waiting-for-me inbox, expiring contracts and price lists."
      items={[
        'Contracts pending approval',
        'Price lists nearing expiry',
        'Billing sheets awaiting action',
      ]}
    />
  )
}
