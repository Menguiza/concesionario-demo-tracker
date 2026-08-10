import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { suscribirReservasDeUsuario } from '../features/reservas/reservasApi'
import { suscribirVehiculos } from '../features/vehiculos/vehiculosApi'
import FormularioRegistroPropio from './FormularioRegistroPropio'

const ROLES_CON_BLOQUEO = ['comercial', 'directivo']

// Bloquea toda la app (sin header, sin nav, sin forma de navegar) mientras el
// usuario tiene una reserva propia en curso y todavía no registró la entrega.
// El "ahora" se refresca con un timer porque, a diferencia de los datos de
// Firestore, el reloj no dispara un nuevo snapshot solo por pasar la hora.
export default function GateReservaActiva({ children }) {
  const { firebaseUser, rol } = useAuth()
  const activo = ROLES_CON_BLOQUEO.includes(rol)

  const [misReservas, setMisReservas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [ahora, setAhora] = useState(new Date())

  useEffect(() => {
    if (!activo || !firebaseUser) return
    return suscribirReservasDeUsuario(firebaseUser.uid, setMisReservas)
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

  const reservaEnCurso = misReservas.find((r) => {
    if (r.resultado !== 'pendiente') return false
    return ahora >= r.fechaInicio.toDate() && ahora <= r.fechaFin.toDate()
  })

  if (!reservaEnCurso) return children

  const vehiculo = vehiculos.find((v) => v.id === reservaEnCurso.vehiculoId)
  if (!vehiculo) return children

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Registro obligatorio</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tienes el vehículo <strong>{vehiculo.placa}</strong> reservado ahora mismo. Registra la entrega para poder seguir usando la
            app.
          </p>
        </div>
        <FormularioRegistroPropio vehiculo={vehiculo} tipo="entrega" reserva={reservaEnCurso} />
        <button onClick={() => signOut(auth)} className="w-full text-xs text-gray-400 underline">
          Salir
        </button>
      </div>
    </div>
  )
}
