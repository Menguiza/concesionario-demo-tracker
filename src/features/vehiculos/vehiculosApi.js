import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

export function suscribirVehiculos(callback) {
  return onSnapshot(collection(db, 'vehiculos'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function crearVehiculo({ placa, marcaModelo, esElectricoHibrido }) {
  return addDoc(collection(db, 'vehiculos'), {
    placa,
    marcaModelo,
    esElectricoHibrido: !!esElectricoHibrido,
    estado: 'disponible',
    movimientoActualId: null,
    quienTiene: null,
  })
}

export function actualizarVehiculo(vehiculoId, cambios) {
  return updateDoc(doc(db, 'vehiculos', vehiculoId), cambios)
}
