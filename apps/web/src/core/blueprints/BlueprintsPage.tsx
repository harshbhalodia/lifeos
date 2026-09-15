import { blueprints } from '@/core/blueprints/registry'

export function BlueprintsPage() {
  return (
    <div className="stack">
      <div>
        <h1>Blueprints</h1>
        <p className="muted">Installed capability modules. Each blueprint owns its own data, UI and version.</p>
      </div>

      <div className="card-grid">
        {blueprints.map((bp) => (
          <div key={bp.id} className="card">
            <div className="card-header">
              <bp.icon size={18} />
              <h3>{bp.name}</h3>
              <span className="badge">v{bp.version}</span>
            </div>
            <p className="muted">{bp.description}</p>
          </div>
        ))}

        <div className="card card-dashed">
          <h3>More blueprints coming soon</h3>
          <p className="muted">
            Health, Learning, Travel, Goals and Habits will install here without touching LifeOS core.
          </p>
        </div>
      </div>
    </div>
  )
}
