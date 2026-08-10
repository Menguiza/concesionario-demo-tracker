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

export function registrarCliente({ nombre, telefono, tipo, comercialAsignadoId, comercialSolicitado }) {
  return addDoc(collection(db, 'clientes'), {
    nombre,
    telefono: telefono ?? null,
    tipo,
    comercialAsignadoId,
    comercialSolicitado: !!comercialSolicitado,
    efectivo: true,
    motivoDescarte: null,
    fechaHora: serverTimestamp(),
  })
}

export function marcarDescarte(clienteId, motivo) {
  return updateDoc(doc(db, 'clientes', clienteId), { efectivo: false, motivoDescarte: motivo })
}

export function suscribirClientesDeComercial(comercialId, callback) {
  const q = query(collection(db, 'clientes'), where('comercialAsignadoId', '==', comercialId))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
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
