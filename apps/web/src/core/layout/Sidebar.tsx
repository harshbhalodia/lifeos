import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Puzzle, Settings, Sparkles } from 'lucide-react'
import { blueprints } from '@/core/blueprints/registry'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Sparkles size={20} />
        <div className="sidebar-brand-text">
          <span>LifeOS</span>
          <span className="sidebar-brand-tagline" title="Plan with purpose. Decide with clarity. Pivot with confidence.">
            pp &middot; dc &middot; pc
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="sidebar-link">
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <div className="sidebar-section-label">Life</div>
        {blueprints.map((bp) => (
          <div key={bp.id} className="sidebar-group">
            <div className="sidebar-group-title">
              <bp.icon size={16} />
              {bp.name}
            </div>
            {bp.navItems.map((item) => (
              <NavLink
                key={item.path}
                to={`/life/${bp.basePath}/${item.path}`.replace(/\/+$/, '') || `/life/${bp.basePath}`}
                end={item.end}
                className="sidebar-sublink"
              >
                <item.icon size={14} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-section-label">System</div>
        <NavLink to="/blueprints" className="sidebar-link">
          <Puzzle size={16} />
          Blueprints
        </NavLink>
        <NavLink to="/settings" className="sidebar-link">
          <Settings size={16} />
          Settings
        </NavLink>
      </nav>
    </aside>
  )
}
