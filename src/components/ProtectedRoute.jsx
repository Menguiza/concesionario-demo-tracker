import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ roles, children }) {
  const { firebaseUser, rol, cargando } = useAuth()

  if (cargando) return <div className="p-6 text-center text-gray-500">Cargando…</div>
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (roles && !roles.includes(rol)) return <Navigate to="/" replace />

  return children
}
