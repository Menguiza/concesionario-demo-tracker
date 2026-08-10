import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { collection, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db, app, auth } from '../../firebase/config'
import { agregarComercialAEquipo } from '../equipos/equiposApi'
import { fechaLocalYYYYMMDD } from '../../lib/fechas'

function urlDeRetornoAlLogin() {
  return { url: `${window.location.origin}${window.location.pathname}#/login` }
}

export function suscribirUsuarios(callback) {
  return onSnapshot(collection(db, 'usuarios'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// Crea la cuenta en una instancia secundaria de Firebase para no cerrar
// la sesión del admin que está creando al nuevo usuario. La membresía de
// equipo vive solo en equipos.miembros (un comercial puede estar en varios);
// aquí no se guarda ningún equipoId en el usuario para evitar dos fuentes
// de verdad desincronizadas.
//
// No se manda la contraseña temporal por correo (nunca se debe mandar una
// contraseña en texto plano) — en vez de eso, se dispara el correo de
// "restablecer contraseña" propio de Firebase apenas se crea la cuenta, para
// que la persona pueda poner la suya. La contraseña temporal sigue sirviendo
// para entrar de una si hace falta usarla el mismo día, antes de que revise
// el correo.
export async function crearUsuarioStaff({ email, password, nombre, telefono, rol, equipoId, horarioSemanal }) {
  const secondaryApp = initializeApp(app.options, 'secondary-' + Date.now())
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      nombre,
      telefono: telefono || null,
      rol,
      horarioSemanal: horarioSemanal ?? null,
      activo: true,
    })
    if (equipoId) {
      await agregarComercialAEquipo(equipoId, cred.user.uid)
    }
    await sendPasswordResetEmail(secondaryAuth, email, urlDeRetornoAlLogin())
    await signOut(secondaryAuth)
    return cred.user.uid
  } finally {
    await deleteApp(secondaryApp)
  }
}

export function enviarCorreoRestablecerPassword(email) {
  return sendPasswordResetEmail(auth, email, urlDeRetornoAlLogin())
}

export function actualizarUsuario(uid, cambios) {
  return updateDoc(doc(db, 'usuarios', uid), cambios)
}

// La llegada es un dato del comercial (¿llegó hoy a trabajar?), no de un
// equipo — así tiene sentido marcarla desde Cola o desde Comerciales, sin
// importar cuál equipo esté activo en ese momento.
export function marcarLlegadaHoy(uid) {
  const ahora = new Date()
  return updateDoc(doc(db, 'usuarios', uid), {
    ultimaLlegada: { fecha: fechaLocalYYYYMMDD(ahora), horaISO: ahora.toISOString() },
  })
}
