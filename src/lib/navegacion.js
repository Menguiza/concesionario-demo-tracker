import { IconoAdmin, IconoComerciales, IconoVehiculos, IconoReservas, IconoCola, IconoReporte } from './iconos'

// Orden de prioridad único para nav y accesos rápidos del dashboard:
// Administración -> Comerciales -> Vehículos -> Reservas -> Cola. Cada rol ve
// solo lo que le aplica, pero conserva este mismo orden relativo. Reportes va
// al final: es una herramienta transversal, no parte de esa jerarquía.
export const SECCIONES = [
  { to: '/admin', label: 'Administración', roles: ['admin'], icono: IconoAdmin },
  { to: '/comerciales', label: 'Comerciales', roles: ['admin', 'anfitriona', 'directivo'], icono: IconoComerciales },
  { to: '/comercial', label: 'Mis clientes', roles: ['comercial'], icono: IconoComerciales },
  { to: '/vehiculos', label: 'Vehículos', roles: ['admin', 'anfitriona', 'comercial', 'directivo'], icono: IconoVehiculos },
  { to: '/reservas', label: 'Reservas', roles: ['admin', 'anfitriona', 'comercial', 'directivo'], icono: IconoReservas },
  { to: '/anfitriona', label: 'Cola', roles: ['admin', 'anfitriona'], icono: IconoCola },
  { to: '/reportes', label: 'Reportes', roles: ['admin', 'anfitriona', 'directivo'], icono: IconoReporte },
]

export function seccionesDeRol(rol) {
  return SECCIONES.filter((s) => s.roles.includes(rol))
}
