import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
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

// Reservas activas del vehículo que arrancan después de fechaFin pero dentro
// de la ventana de aviso (por defecto 24h) — no bloquean, solo alertan para
// que quien presta el carro avise "debe estar de vuelta antes de tal hora".
export async function proximasReservasDelVehiculo(vehiculoId, fechaFin, horasAviso = 24) {
  const limite = new Date(fechaFin.getTime() + horasAviso * 60 * 60 * 1000)
  const qReservas = query(
    collection(db, 'reservas'),
    where('vehiculoId', '==', vehiculoId),
    where('estado', '==', 'activa')
  )
  const snap = await getDocs(qReservas)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.fechaInicio.toDate() > fechaFin && r.fechaInicio.toDate() <= limite)
    .sort((a, b) => a.fechaInicio.toDate() - b.fechaInicio.toDate())
}

export function crearReserva({ vehiculoId, fechaInicio, fechaFin, solicitadoPor, motivo, autorizadoPor = null, responsable = null }) {
  return addDoc(collection(db, 'reservas'), {
    vehiculoId,
    fechaInicio: Timestamp.fromDate(fechaInicio),
    fechaFin: Timestamp.fromDate(fechaFin),
    solicitadoPor,
    motivo,
    autorizadoPor,
    responsable,
    estado: 'activa',
    resultado: 'pendiente',
    devolucionResultado: 'pendiente',
    movimientoId: null,
    movimientoDevolucionId: null,
    creadoEn: serverTimestamp(),
  })
}

export function cancelarReserva(reservaId) {
  return updateDoc(doc(db, 'reservas', reservaId), { estado: 'cancelada' })
}

export function marcarReservaCumplida(reservaId, movimientoId) {
  return updateDoc(doc(db, 'reservas', reservaId), { resultado: 'cumplida', movimientoId })
}

// Se usa cuando quien debía recibir el vehículo renuncia a llenar el
// registro (botón "Omitir") — queda constancia de que no hay fotos/documento
// que respalden en qué estado lo recibió.
export function marcarReservaOmitida(reservaId, movimientoId) {
  return updateDoc(doc(db, 'reservas', reservaId), { resultado: 'omitida', movimientoId })
}

// La devolución no tiene plazo: se marca "completada" cuando el propio
// responsable la registra, o "incumplida" si a alguien más le tocó recibir
// el vehículo primero (ver registrarMovimiento en movimientosApi.js).
export function marcarDevolucionCompletada(reservaId, movimientoDevolucionId) {
  return updateDoc(doc(db, 'reservas', reservaId), { devolucionResultado: 'completada', movimientoDevolucionId })
}

export function marcarDevolucionIncumplida(reservaId) {
  return updateDoc(doc(db, 'reservas', reservaId), { devolucionResultado: 'incumplida' })
}

export function suscribirReservas(callback) {
  const q = query(collection(db, 'reservas'), orderBy('fechaInicio', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Reservas propias (por uid) que siguen activas — usado por el bloqueo de
// pantalla completa y por Vehículos para saber qué puede registrar cada quien.
export function suscribirReservasDeUsuario(uid, callback) {
  const q = query(
    collection(db, 'reservas'),
    where('solicitadoPor.uid', '==', uid),
    where('estado', '==', 'activa')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Reservas donde uid quedó como responsable (préstamo a cliente que alguien
// del staff debe registrar) — separado de solicitadoPor porque un cliente no
// tiene cuenta propia; se combina con suscribirReservasDeUsuario en quien
// consuma ambas (ver GateReservaActiva) en vez de depender de un query "or".
export function suscribirReservasComoResponsable(uid, callback) {
  const q = query(
    collection(db, 'reservas'),
    where('responsable.uid', '==', uid),
    where('estado', '==', 'activa')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Todas las reservas cuyo inicio cae en el rango — un solo filtro por rango
// (sin combinarlo con igualdades) para no depender de un índice compuesto.
// El filtrado por vehículo/persona específica se hace en el cliente.
export async function listarReservasEnRango(desde, hasta) {
  const q = query(
    collection(db, 'reservas'),
    where('fechaInicio', '>=', Timestamp.fromDate(desde)),
    where('fechaInicio', '<=', Timestamp.fromDate(hasta)),
    orderBy('fechaInicio', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Barrido perezoso: reservas cuyo horario ya pasó y nadie registró el
// movimiento correspondiente quedan marcadas como incumplidas, para poder
// saber después a quién se le adjudica la falta.
export async function barrerReservasVencidas(reservas) {
  const ahora = new Date()
  const vencidasSinCumplir = reservas.filter(
    (r) => r.estado === 'activa' && r.resultado === 'pendiente' && r.fechaFin.toDate() < ahora
  )
  await Promise.all(vencidasSinCumplir.map((r) => updateDoc(doc(db, 'reservas', r.id), { resultado: 'incumplida' })))
}
