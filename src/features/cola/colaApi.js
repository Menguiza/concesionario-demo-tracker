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

export function registrarLlegada(equipoId, comercialId, llegadasActuales) {
  return updateDoc(doc(db, 'colaEquipo', equipoId), {
    llegadas: { ...llegadasActuales, [comercialId]: new Date().toISOString() },
  })
}
