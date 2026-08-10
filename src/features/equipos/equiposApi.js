import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/config'

export function suscribirEquipos(callback) {
  return onSnapshot(collection(db, 'equipos'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function crearEquipo(nombre) {
  return addDoc(collection(db, 'equipos'), { nombre, miembros: [] })
}

export function actualizarMiembrosEquipo(equipoId, miembros) {
  return updateDoc(doc(db, 'equipos', equipoId), { miembros })
}

export function suscribirEstadoSemana(callback) {
  return onSnapshot(doc(db, 'estadoSemana', 'actual'), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export async function fijarEquipoActivo(equipoId) {
  await setDoc(
    doc(db, 'estadoSemana', 'actual'),
    { equipoActivoId: equipoId, fechaInicioSemana: serverTimestamp() },
    { merge: true }
  )
  await addDoc(collection(db, 'historialEquipos'), {
    equipoId,
    fecha: serverTimestamp(),
  })
}
