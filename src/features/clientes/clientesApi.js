import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/config'

// referidoPor es texto libre y opcional: quién señaló a este comercial en
// concreto cuando se pide específicamente — puede ser "lo delegó Andrea de
// la sede Norte" o "el cliente lo conoce de antes", lo que aplique. No se
// fuerza a elegir entre categorías porque en la vida real no siempre es uno
// de dos casos limpios.
export function registrarCliente({
  nombre,
  telefono,
  tipo,
  comercialAsignadoId,
  comercialSolicitado,
  clienteMaestroId = null,
  observaciones = null,
  referidoPor = null,
}) {
  return addDoc(collection(db, 'clientes'), {
    nombre,
    telefono: telefono ?? null,
    tipo,
    comercialAsignadoId,
    comercialSolicitado: !!comercialSolicitado,
    clienteMaestroId,
    observaciones,
    referidoPor,
    efectivo: true,
    motivoDescarte: null,
    fechaHora: serverTimestamp(),
  })
}

export function marcarDescarte(clienteId, motivo) {
  return updateDoc(doc(db, 'clientes', clienteId), { efectivo: false, motivoDescarte: motivo })
}

export function revertirDescarte(clienteId) {
  return updateDoc(doc(db, 'clientes', clienteId), { efectivo: true, motivoDescarte: null })
}

export function suscribirClientesDeComercial(comercialId, callback) {
  const q = query(collection(db, 'clientes'), where('comercialAsignadoId', '==', comercialId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Todos los clientes (de cualquier comercial) en el rango — para reportes.
// Un solo filtro por rango; el filtrado por comercial específico se hace en
// el cliente para no depender de un índice compuesto.
export async function listarClientesEnRango(desde, hasta) {
  const q = query(
    collection(db, 'clientes'),
    where('fechaHora', '>=', Timestamp.fromDate(desde)),
    where('fechaHora', '<=', Timestamp.fromDate(hasta))
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function contarClientesEfectivosEnRango(comercialId, desde, hasta) {
  const q = query(
    collection(db, 'clientes'),
    where('comercialAsignadoId', '==', comercialId),
    where('efectivo', '==', true),
    where('fechaHora', '>=', Timestamp.fromDate(desde)),
    where('fechaHora', '<=', Timestamp.fromDate(hasta))
  )
  const snap = await getDocs(q)
  return snap.size
}
