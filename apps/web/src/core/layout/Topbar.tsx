import { LogOut } from 'lucide-react'
import { useAuth } from '@/core/auth/AuthContext'

export function Topbar() {
  const { user, signOut } = useAuth()

  return (
    <header className="topbar">
      <div />
      <div className="topbar-user">
        <span className="topbar-email">{user?.email}</span>
        <button className="btn btn-ghost" onClick={() => void signOut()}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  )
}
