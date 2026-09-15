import type { Blueprint } from './types'
import { wealthBlueprint } from '@/blueprints/wealth'

/**
 * Static registry of installed blueprints. Adding a new life-area module
 * (health, learning, travel, ...) means adding one entry here — core
 * routing, navigation and the dashboard all pick it up automatically.
 */
export const blueprints: Blueprint[] = [wealthBlueprint]

export function getBlueprint(id: string): Blueprint | undefined {
  return blueprints.find((b) => b.id === id)
}
