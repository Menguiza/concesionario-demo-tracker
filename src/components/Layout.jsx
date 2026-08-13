import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { seccionesDeRol } from '../lib/navegacion'
import { IconoInicio, IconoContrasena, IconoSalir, IconoMenu, IconoCerrar } from '../lib/iconos'
import GateReservaActiva from './GateReservaActiva'

function iniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

const ITEM_NAV =
  'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors duration-150'
const ITEM_NAV_ACTIVO = 'bg-brand-600 text-white'
const ITEM_NAV_INACTIVO = 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'

export default function Layout() {
  const { perfil, rol } = useAuth()
  const location = useLocation()
  const links = seccionesDeRol(rol)
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => setMenuAbierto(false), [location.pathname])

  return (
    <GateReservaActiva>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="max-w-3xl lg:max-w-5xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  to="/"
                  title="Inicio"
                  className="flex items-center gap-2 shrink-0 group"
                >
                  <span className="w-8 h-8 rounded-lg bg-brand-900 flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
                    <svg viewBox="0 0 32 32" className="w-5 h-5">
                      <circle cx="13.5" cy="13" r="6.25" fill="none" stroke="#F5F1E8" strokeWidth="2.6" />
                      <circle cx="13.5" cy="13" r="2.1" fill="#D3AD74" />
                      <path d="M18.2 17.7 L24.5 24" stroke="#F5F1E8" strokeWidth="2.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="hidden md:block font-marca text-lg font-semibold text-gray-900 tracking-tight">Rotaflota</span>
                </Link>

                <nav className="hidden sm:flex flex-wrap gap-1">
                  <NavLink
                    to="/"
                    end
                    title="Inicio"
                    className={({ isActive }) => `${ITEM_NAV} ${isActive ? ITEM_NAV_ACTIVO : ITEM_NAV_INACTIVO}`}
                  >
                    <IconoInicio className="w-4 h-4 shrink-0" />
                    <span>Inicio</span>
                  </NavLink>
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) => `${ITEM_NAV} ${isActive ? ITEM_NAV_ACTIVO : ITEM_NAV_INACTIVO}`}
                    >
                      <link.icono className="w-4 h-4 shrink-0" />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="hidden sm:flex items-center gap-2 shrink-0">
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
                  <IconoContrasena className="w-4 h-4" />
                </NavLink>
                <button
                  onClick={() => signOut(auth)}
                  title="Salir"
                  className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                >
                  <IconoSalir className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setMenuAbierto((v) => !v)}
                title={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                className="sm:hidden text-gray-500 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
              >
                {menuAbierto ? <IconoCerrar className="w-5 h-5" /> : <IconoMenu className="w-5 h-5" />}
              </button>
            </div>

            {menuAbierto && (
              <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 space-y-1 animate-slide-up">
                <nav className="space-y-1">
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <IconoInicio className="w-4 h-4 shrink-0" />
                    Inicio
                  </NavLink>
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                        }`
                      }
                    >
                      <link.icono className="w-4 h-4 shrink-0" />
                      {link.label}
                    </NavLink>
                  ))}
                </nav>

                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  <div className="flex items-center gap-2.5 px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                      {iniciales(perfil?.nombre)}
                    </div>
                    <span className="text-sm text-gray-600 truncate">{perfil?.nombre}</span>
                  </div>
                  <NavLink to="/cambiar-password" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                    <IconoContrasena className="w-4 h-4 shrink-0" />
                    Cambiar contraseña
                  </NavLink>
                  <button
                    onClick={() => signOut(auth)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <IconoSalir className="w-4 h-4 shrink-0" />
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 max-w-3xl lg:max-w-5xl mx-auto w-full">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-gray-200 px-4 py-4 text-center">
          <p className="text-xs text-gray-400">
            by Daniel Hoyos <span className="text-gray-300">&middot;</span> <span className="text-gray-500">@menguiza</span>
          </p>
          <p className="text-[11px] text-gray-300 mt-0.5">© {new Date().getFullYear()} Daniel Hoyos. All rights reserved.</p>
        </footer>
      </div>
    </GateReservaActiva>
  )
}
