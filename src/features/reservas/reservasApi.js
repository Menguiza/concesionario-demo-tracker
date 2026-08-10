import { collection, doc, addDoc, updateDoc, query, where, getDocs, onSnapshot, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'

function seTraslapan(inicioA, finA, inicioB, finB) {
  return inicioA <= finB && inicioB <= finA
}

// Cruza reservas activas del vehículo contra el rango solicitado (fecha y
// hora exactas), para evitar comprometerlo dos veces en el mismo momento.
export async function verificarDisponibilidad(vehiculoId, fechaInicio, fechaFin, ignorarReservaId = null) {
  const qReservas = query(
    collection(db, 'reservas'),
    where('vehiculoId', '==', vehiculoId),
    where('estado', '==', 'activa')
  )
  const snap = await getDocs(qReservas)
  const conflictos = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.id !== ignorarReservaId)
    .filter((r) => seTraslapan(fechaInicio, fechaFin, r.fechaInicio.toDate(), r.fechaFin.toDate()))

  return { disponible: conflictos.length === 0, conflictos }
}

export function crearReserva({ vehiculoId, fechaInicio, fechaFin, solicitadoPor, motivo }) {
  return addDoc(collection(db, 'reservas'), {
    vehiculoId,
    fechaInicio: Timestamp.fromDate(fechaInicio),
    fechaFin: Timestamp.fromDate(fechaFin),
    solicitadoPor,
    motivo,
    estado: 'activa',
    creadoEn: serverTimestamp(),
  })
}

export function cancelarReserva(reservaId) {
  return updateDoc(doc(db, 'reservas', reservaId), { estado: 'cancelada' })
}

export function suscribirReservas(callback) {
  const q = query(collection(db, 'reservas'), orderBy('fechaInicio', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}
