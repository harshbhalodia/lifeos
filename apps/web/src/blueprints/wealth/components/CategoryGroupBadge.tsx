import type { WealthCategoryGroup } from '../types'

const FALLBACK_COLOR = '#6b6255'

/** Renders a colored pill for a user-defined category group (or "Uncategorized" if none). */
export function CategoryGroupBadge({ group }: { group: WealthCategoryGroup | null | undefined }) {
  const color = group?.color || FALLBACK_COLOR
  return (
    <span className="tag-pill" style={{ background: `${color}1a`, color }}>
      {group?.name ?? 'Uncategorized'}
    </span>
  )
}
