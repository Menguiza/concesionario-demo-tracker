import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { suscribirReservasDeUsuario, suscribirReservasComoResponsable } from '../features/reservas/reservasApi'
import { suscribirVehiculos } from '../features/vehiculos/vehiculosApi'
import FormularioRegistroPropio from './FormularioRegistroPropio'
import Tarjeta from './Tarjeta'

const ROLES_CON_BLOQUEO = ['comercial', 'directivo']

// Bloquea toda la app (sin header, sin nav, sin forma de navegar) mientras el
// usuario tiene una reserva propia en curso y todavía no registró la entrega.
// El "ahora" se refresca con un timer porque, a diferencia de los datos de
// Firestore, el reloj no dispara un nuevo snapshot solo por pasar la hora.
export default function GateReservaActiva({ children }) {
  const { firebaseUser, rol } = useAuth()
  const activo = ROLES_CON_BLOQUEO.includes(rol)

  const [misReservas, setMisReservas] = useState([])
  const [reservasComoResponsable, setReservasComoResponsable] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [ahora, setAhora] = useState(new Date())

  useEffect(() => {
    if (!activo || !firebaseUser) return
    return suscribirReservasDeUsuario(firebaseUser.uid, setMisReservas)
  }, [activo, firebaseUser])

  // Además de sus propias reservas, alguien puede quedar como "responsable"
  // de una reserva hecha para un cliente (ver AnfitrionaPage/VehiculosPage) —
  // eso también dispara el bloqueo, por eso es una suscripción aparte.
  useEffect(() => {
    if (!activo || !firebaseUser) return
    return suscribirReservasComoResponsable(firebaseUser.uid, setReservasComoResponsable)
  }, [activo, firebaseUser])

  useEffect(() => {
    if (!activo) return
    return suscribirVehiculos(setVehiculos)
  }, [activo])

  useEffect(() => {
    if (!activo) return
    const id = setInterval(() => setAhora(new Date()), 20000)
    return () => clearInterval(id)
  }, [activo])

  if (!activo) return children

  const todasMisReservas = [...misReservas, ...reservasComoResponsable.filter((r) => !misReservas.some((m) => m.id === r.id))]
  const reservaEnCurso = todasMisReservas.find((r) => {
    if (r.resultado !== 'pendiente') return false
    return ahora >= r.fechaInicio.toDate() && ahora <= r.fechaFin.toDate()
  })

  if (!reservaEnCurso) return children

  const vehiculo = vehiculos.find((v) => v.id === reservaEnCurso.vehiculoId)
  if (!vehiculo) return children

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,_rgba(217,119,6,0.06),_transparent_60%)]">
      <Tarjeta className="w-full max-w-sm p-6 space-y-4 animate-scale-in">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-amber-700">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.4 20.5h17.2a1.5 1.5 0 001.29-2.46L13.71 3.86a1.5 1.5 0 00-2.42 0z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Registro obligatorio</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Tienes el vehículo <strong className="text-gray-700">{vehiculo.placa}</strong> reservado ahora mismo. Registra la entrega
              para poder seguir usando la app.
            </p>
          </div>
        </div>
        <FormularioRegistroPropio
          vehiculo={vehiculo}
          tipo="entrega"
          reserva={reservaEnCurso}
          ocultarToggleCliente={reservaEnCurso.solicitadoPor?.tipo === 'cliente'}
        />
        <button onClick={() => signOut(auth)} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Salir
        </button>
      </Tarjeta>
    </div>
  )
}
