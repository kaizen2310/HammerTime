import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import ThemeToggle from './theme-toggle'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">
          HammerTime
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Hidden on phones so the nav plus the theme toggle doesn't overflow */}
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.username}</span>
              <Button variant="outline" size="sm" nativeButton={false} render= {
                <Link to="/create">New Auction</Link>
              } />
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" nativeButton={false} render = {
                <Link to="/login">Login</Link>
              } />
              <Button size="sm" nativeButton={false} render = {
                <Link to="/register">Register</Link>
              } />
            </>
          )}
          <ThemeToggle />
        </div>
      </nav>
      <Separator />
    </>
  )
}
