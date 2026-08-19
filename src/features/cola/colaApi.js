import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { fechaLocalYYYYMMDD } from '../../lib/fechas'

export function suscribirColaEquipo(equipoId, callback) {
  return onSnapshot(doc(db, 'colaEquipo', equipoId), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export function inicializarColaSemana(equipoId, orden) {
  return setDoc(doc(db, 'colaEquipo', equipoId), {
    orden,
    ocupados: [],
    clienteActual: {},
  })
}

export function actualizarOrden(equipoId, orden) {
  return updateDoc(doc(db, 'colaEquipo', equipoId), { orden })
}

// El orden inicial (por clientes atendidos ayer) solo debería mandar ANTES
// de que alguien llegue — una vez llega, quien llegó primero debe recibir
// primero, sin importar su prioridad original. Por eso, al marcar llegada,
// esta persona se reubica justo después del último que ya había llegado (y
// antes de todos los que no han llegado): así el grupo que ya llegó queda
// ordenado por orden real de llegada, y la prioridad original solo decide
// el orden entre quienes todavía no han llegado. Se hace con una lectura
// fresca (no con estado de suscripción) para que funcione igual desde Cola
// como desde Comerciales, sin depender de qué esté suscrito esa pantalla.
export async function reordenarPorLlegada(comercialId) {
  const estadoSnap = await getDoc(doc(db, 'estadoSemana', 'actual'))
  const equipoActivoId = estadoSnap.exists() ? estadoSnap.data().equipoActivoId : null
  if (!equipoActivoId) return

  const colaSnap = await getDoc(doc(db, 'colaEquipo', equipoActivoId))
  if (!colaSnap.exists()) return
  const orden = colaSnap.data().orden ?? []
  if (!orden.includes(comercialId)) return

  const hoyStr = fechaLocalYYYYMMDD()
  const otros = orden.filter((id) => id !== comercialId)
  const snaps = await Promise.all(otros.map((id) => getDoc(doc(db, 'usuarios', id))))
  const idsLlegados = new Set(
    snaps.filter((s) => s.exists() && s.data().ultimaLlegada?.fecha === hoyStr).map((s) => s.id)
  )

  const llegados = otros.filter((id) => idsLlegados.has(id))
  const noLlegados = otros.filter((id) => !idsLlegados.has(id))
  await updateDoc(doc(db, 'colaEquipo', equipoActivoId), { orden: [...llegados, comercialId, ...noLlegados] })
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
