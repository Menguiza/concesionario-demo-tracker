import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  arrayUnion,
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

export function agregarComercialAEquipo(equipoId, comercialId) {
  return updateDoc(doc(db, 'equipos', equipoId), { miembros: arrayUnion(comercialId) })
}

export function suscribirEstadoSemana(callback) {
  return onSnapshot(doc(db, 'estadoSemana', 'actual'), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

// Fijar equipo activo "a mano" (Iniciar semana / Reiniciar orden / Cambiar
// equipo) siempre re-ancla la rotación: hoy pasa a ser el día 0 de ese
// equipo, y la alternancia automática cuenta días hábiles desde acá.
export async function fijarEquipoActivo(equipoId, hoyYYYYMMDD) {
  await setDoc(
    doc(db, 'estadoSemana', 'actual'),
    {
      equipoActivoId: equipoId,
      equipoInicialId: equipoId,
      fechaInicioNegocio: hoyYYYYMMDD,
      ultimoDiaActivado: hoyYYYYMMDD,
      fechaInicioSemana: serverTimestamp(),
    },
    { merge: true }
  )
  await addDoc(collection(db, 'historialEquipos'), {
    equipoId,
    fecha: serverTimestamp(),
  })
}

// Avanza el equipo activo del día por la rotación automática, sin mover el
// ancla (equipoInicialId/fechaInicioNegocio quedan igual).
export async function avanzarEquipoDelDia(equipoId, hoyYYYYMMDD) {
  await updateDoc(doc(db, 'estadoSemana', 'actual'), { equipoActivoId: equipoId, ultimoDiaActivado: hoyYYYYMMDD })
  await addDoc(collection(db, 'historialEquipos'), {
    equipoId,
    fecha: serverTimestamp(),
  })
}
