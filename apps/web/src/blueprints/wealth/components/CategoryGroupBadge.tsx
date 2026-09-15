import type { CategoryGroup } from '../types'
import { CATEGORY_GROUP_LABELS } from '../types'

const GROUP_COLORS: Record<CategoryGroup, string> = {
  fixed: '#2f6d4f',
  variable: '#a15c07',
  adhoc: '#b3261e',
  investments: '#275475',
  new_investments: '#6d4fa1',
  income: '#1f4d38',
}

export function CategoryGroupBadge({ group }: { group: CategoryGroup }) {
  return (
    <span className="tag-pill" style={{ background: `${GROUP_COLORS[group]}1a`, color: GROUP_COLORS[group] }}>
      {CATEGORY_GROUP_LABELS[group]}
    </span>
  )
}
