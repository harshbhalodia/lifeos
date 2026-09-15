import type { ComponentType, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * The Blueprint contract is LifeOS core's UI extension API.
 * Every life-area module (wealth, health, learning, ...) implements this
 * shape and registers itself in `core/blueprints/registry.ts`.
 * Core never imports a specific blueprint's internals directly.
 */
export interface BlueprintNavItem {
  /** Path relative to the blueprint's mount point, e.g. "" or "accounts" */
  path: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export interface BlueprintRoute {
  /** Path relative to the blueprint's mount point */
  path: string
  element: ReactNode
}

export interface DashboardWidgetProps {
  className?: string
}

export interface Blueprint {
  id: string
  name: string
  description: string
  version: string
  icon: LucideIcon
  /** Mounted under /life/<id>/... */
  basePath: string
  navItems: BlueprintNavItem[]
  routes: BlueprintRoute[]
  /** Optional widget rendered on the LifeOS dashboard */
  DashboardWidget?: ComponentType<DashboardWidgetProps>
}
