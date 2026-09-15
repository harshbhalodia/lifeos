import { blueprints } from '@/core/blueprints/registry'

export function DashboardPage() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="stack">
      <div>
        <h1>{greeting}</h1>
        <p className="muted">Your life, at a glance.</p>
      </div>

      <div className="widget-grid">
        {blueprints.map((bp) =>
          bp.DashboardWidget ? <bp.DashboardWidget key={bp.id} /> : null,
        )}
      </div>
    </div>
  )
}
