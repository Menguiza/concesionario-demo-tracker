import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db, app } from '../../firebase/config'

export function suscribirUsuarios(callback) {
  return onSnapshot(collection(db, 'usuarios'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea la cuenta en una instancia secundaria de Firebase para no cerrar
// la sesión del admin que está creando al nuevo usuario.
export async function crearUsuarioStaff({ email, password, nombre, rol, equipoId, horarioSemanal }) {
  const secondaryApp = initializeApp(app.options, 'secondary-' + Date.now())
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      nombre,
      rol,
      equipoId: equipoId ?? null,
      horarioSemanal: horarioSemanal ?? null,
      activo: true,
    })
    await signOut(secondaryAuth)
    return cred.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}

export function actualizarUsuario(uid, cambios) {
  return updateDoc(doc(db, 'usuarios', uid), cambios)
}
