import { collection, doc, addDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'

// Catálogo de etiquetas de comerciales (ej: "Planta", "Web") — lo crea solo
// admin (ver firestore.rules). Asignarlas a un comercial puntual se hace
// directo con actualizarUsuario(uid, { tags }) desde usuariosApi, no hace
// falta una función aparte para eso.
export function suscribirEtiquetas(callback) {
  return onSnapshot(collection(db, 'etiquetas'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function crearEtiqueta(nombre) {
  return addDoc(collection(db, 'etiquetas'), { nombre: nombre.trim(), creadoEn: serverTimestamp() })
}

export function eliminarEtiqueta(id) {
  return deleteDoc(doc(db, 'etiquetas', id))
}
