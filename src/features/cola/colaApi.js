import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

export function suscribirColaEquipo(equipoId, callback) {
  return onSnapshot(doc(db, 'colaEquipo', equipoId), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export function inicializarColaSemana(equipoId, orden) {
  return setDoc(doc(db, 'colaEquipo', equipoId), {
    orden,
    ocupados: [],
    llegadas: {},
    clienteActual: {},
  })
}

export function actualizarOrden(equipoId, orden) {
  return updateDoc(doc(db, 'colaEquipo', equipoId), { orden })
}

export function marcarOcupado(equipoId, comercialId, ocupado, ocupadosActuales) {
  const nuevos = ocupado
    ? [...new Set([...ocupadosActuales, comercialId])]
    : ocupadosActuales.filter((id) => id !== comercialId)
  return updateDoc(doc(db, 'colaEquipo', equipoId), { ocupados: nuevos })
}

// Cliente que un comercial está atendiendo ahora mismo. Se usa para exigir
// resolver si fue efectivo o no antes de dejarlo libre otra vez cuando el
// "ocupado" vino de una asignación (no de una ausencia u otro motivo manual).
export function establecerClienteActual(equipoId, comercialId, clienteId, clienteActualActual) {
  const nuevo = { ...clienteActualActual }
  if (clienteId) {
    nuevo[comercialId] = clienteId
  } else {
    delete nuevo[comercialId]
  }
  return updateDoc(doc(db, 'colaEquipo', equipoId), { clienteActual: nuevo })
}

// Se guarda con fecha (no solo hora) para poder distinguir "llegó hoy" de
// una marca de un día anterior que quedó guardada de la semana en curso.
export function registrarLlegada(equipoId, comercialId, llegadasActuales) {
  const ahora = new Date()
  return updateDoc(doc(db, 'colaEquipo', equipoId), {
    llegadas: {
      ...llegadasActuales,
      [comercialId]: { fecha: ahora.toISOString().slice(0, 10), horaISO: ahora.toISOString() },
    },
  })
}
