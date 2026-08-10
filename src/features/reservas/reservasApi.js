import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'

function seTraslapan(inicioA, finA, inicioB, finB) {
  return inicioA <= finB && inicioB <= finA
}

// Cruza reservas activas y movimientos en curso (préstamo abierto) del vehículo
// contra el rango solicitado, para evitar comprometerlo dos veces.
export async function verificarDisponibilidad(vehiculoId, fechaInicio, fechaFin) {
  const qReservas = query(
    collection(db, 'reservas'),
    where('vehiculoId', '==', vehiculoId),
    where('estado', '==', 'activa')
  )
  const snap = await getDocs(qReservas)
  const conflictos = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) =>
      seTraslapan(fechaInicio, fechaFin, r.fechaInicio.toDate(), r.fechaFin.toDate())
    )

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
  })
}
