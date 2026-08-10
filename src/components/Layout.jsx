import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { seccionesDeRol } from '../lib/navegacion'
import { IconoInicio } from '../lib/iconos'
import GateReservaActiva from './GateReservaActiva'

function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

export default function Layout() {
  const { perfil, rol } = useAuth()
  const location = useLocation()
  const links = seccionesDeRol(rol)

  return (
    <GateReservaActiva>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="max-w-3xl lg:max-w-5xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                title="Inicio"
                className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0 transition-transform duration-150 hover:scale-105 active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
                  <path
                    d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13M5 13h14v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-5z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <circle cx="7.5" cy="16" r="0.8" fill="currentColor" />
                  <circle cx="16.5" cy="16" r="0.8" fill="currentColor" />
                </svg>
              </Link>
              <nav className="flex flex-wrap gap-1">
                <NavLink
                  to="/"
                  end
                  title="Inicio"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                      isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`
                  }
                >
                  <IconoInicio className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Inicio</span>
                </NavLink>
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                        isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    <link.icono className="w-4 h-4 shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                  {iniciales(perfil?.nombre)}
                </div>
                <span className="text-sm text-gray-600 truncate max-w-[120px]">{perfil?.nombre}</span>
              </div>
              <NavLink
                to="/cambiar-password"
                title="Cambiar contraseña"
                className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path
                    d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM12.7 9.3L20 16.6M17.5 12.5L20 15l-2 2-2-2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </NavLink>
              <button
                onClick={() => signOut(auth)}
                title="Salir"
                className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path
                    d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3M16 17l5-5-5-5M21 12H9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 max-w-3xl lg:max-w-5xl mx-auto">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </GateReservaActiva>
  )
}
