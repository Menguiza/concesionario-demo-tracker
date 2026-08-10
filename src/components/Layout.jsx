import { NavLink, Outlet } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'

const LINKS_POR_ROL = {
  admin: [
    { to: '/admin', label: 'Administración' },
    { to: '/vehiculos', label: 'Vehículos' },
    { to: '/reservas', label: 'Reservas' },
    { to: '/anfitriona', label: 'Cola' },
  ],
  anfitriona: [
    { to: '/anfitriona', label: 'Cola' },
    { to: '/vehiculos', label: 'Vehículos' },
    { to: '/reservas', label: 'Reservas' },
  ],
  comercial: [
    { to: '/comercial', label: 'Mis clientes' },
    { to: '/vehiculos', label: 'Vehículos' },
    { to: '/reservas', label: 'Reservas' },
  ],
  directivo: [
    { to: '/vehiculos', label: 'Vehículos' },
    { to: '/reservas', label: 'Reservas' },
  ],
}

export default function Layout() {
  const { perfil, rol } = useAuth()
  const links = LINKS_POR_ROL[rol] ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-x-4 gap-y-1.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm text-gray-500 truncate">{perfil?.nombre}</span>
          <button onClick={() => signOut(auth)} className="text-sm text-gray-500 underline shrink-0">
            Salir
          </button>
        </div>
      </header>
      <main className="p-4 max-w-3xl lg:max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
