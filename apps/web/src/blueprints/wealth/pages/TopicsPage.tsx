import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useWealthData } from '../hooks'
import * as api from '../api'
import { Modal } from '../components/Modal'
import { TOPIC_STATUS_LABELS } from '../types'
import type { TopicStatus, WealthTopic } from '../types'

const TOPIC_STATUSES = Object.keys(TOPIC_STATUS_LABELS) as TopicStatus[]

const STATUS_BADGE_CLASS: Record<TopicStatus, string> = {
  exploring: 'badge',
  researching: 'badge badge-warning',
  decided: 'badge badge-success',
  parked: 'badge badge-danger',
}

export function TopicsPage() {
  const { goals } = useWealthData()
  const [topics, setTopics] = useState<WealthTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<WealthTopic | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setTopics(await api.listTopics())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load topics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this research topic?')) return
    await api.deleteTopic(id)
    await load()
  }

  const goalById = new Map(goals.map((g) => [g.id, g]))

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>Research Topics</h1>
          <p className="muted">
            Notes on things you're exploring — retirement strategies, tax moves, a market you're curious about.
            Link a topic to a goal for context. Feeds the Research Advisor agent alongside your watchlist.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add topic
        </button>
      </div>

      {error && <div className="callout callout-error">{error}</div>}

      {!loading && topics.length === 0 && <p className="muted">No topics yet.</p>}

      <div className="card-grid">
        {topics.map((topic) => (
          <div key={topic.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setEditing(topic)}>
            <div className="card-header">
              <h3>{topic.title}</h3>
              {topic.category && (
                <span className="badge" style={{ marginLeft: 'auto' }}>
                  {topic.category}
                </span>
              )}
            </div>
            <p className="muted">{topic.description}</p>
            {topic.related_goal_id && goalById.get(topic.related_goal_id) && (
              <p className="stat-sub">Related goal: {goalById.get(topic.related_goal_id)?.name}</p>
            )}
            <div className="row-between" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
              <span className={STATUS_BADGE_CLASS[topic.status]}>{TOPIC_STATUS_LABELS[topic.status]}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => void handleDelete(topic.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showForm || editing) && (
        <TopicForm
          topic={editing}
          goals={goals}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={load}
        />
      )}
    </div>
  )
}

function TopicForm({
  topic,
  goals,
  onClose,
  onSaved,
}: {
  topic: WealthTopic | null
  goals: ReturnType<typeof useWealthData>['goals']
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [title, setTitle] = useState(topic?.title ?? '')
  const [description, setDescription] = useState(topic?.description ?? '')
  const [category, setCategory] = useState(topic?.category ?? '')
  const [status, setStatus] = useState<TopicStatus>(topic?.status ?? 'exploring')
  const [relatedGoalId, setRelatedGoalId] = useState(topic?.related_goal_id ?? '')
  const [priority, setPriority] = useState(String(topic?.priority ?? 0))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.upsertTopic({
        id: topic?.id,
        title,
        description,
        category: category || null,
        status,
        related_goal_id: relatedGoalId || null,
        priority: Number(priority),
      })
      await onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={topic ? 'Edit topic' : 'Add topic'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="span-2">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="span-2">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
        </label>
        <label>
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. retirement, tax" />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as TopicStatus)}>
            {TOPIC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TOPIC_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Related goal
          <select value={relatedGoalId} onChange={(e) => setRelatedGoalId(e.target.value)}>
            <option value="">None</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </label>
        <div className="span-2 row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
