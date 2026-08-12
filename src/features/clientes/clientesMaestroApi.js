import { collection, addDoc, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { normalizarTexto } from '../../lib/texto'

const SUFIJO_MAXIMO_UNICODE = String.fromCharCode(0xf8ff)

function soloDigitos(telefono) {
  return (telefono ?? '').replace(/\D/g, '')
}

// Para sugerirle a la anfitriona "¿es este cliente?" mientras escribe.
// Prioriza teléfono exacto (confiable); si no hay o no matchea, cae a
// nombre normalizado por prefijo. No es identidad dura — dos personas
// distintas con el mismo nombre y sin teléfono pueden seguir pareciendo
// la misma persona aquí; por eso esto es solo una sugerencia, nunca un
// merge automático (ver crearOReutilizarClienteMaestro).
export async function buscarClienteMaestro({ nombre, telefono }) {
  const digitos = soloDigitos(telefono)
  if (digitos.length >= 7) {
    const qTelefono = query(collection(db, 'clientesMaestro'), where('telefono', '==', digitos), limit(1))
    const snapTelefono = await getDocs(qTelefono)
    if (!snapTelefono.empty) {
      const d = snapTelefono.docs[0]
      return { id: d.id, ...d.data() }
    }
  }

  const prefijo = normalizarTexto(nombre).trim()
  if (prefijo.length < 3) return null
  const qNombre = query(
    collection(db, 'clientesMaestro'),
    where('nombreNormalizado', '>=', prefijo),
    where('nombreNormalizado', '<=', prefijo + SUFIJO_MAXIMO_UNICODE),
    limit(1)
  )
  const snapNombre = await getDocs(qNombre)
  if (snapNombre.empty) return null
  const d = snapNombre.docs[0]
  return { id: d.id, ...d.data() }
}

// clienteMaestroIdConfirmado viene cuando la anfitriona ya eligió una
// sugerencia de buscarClienteMaestro — en ese caso se reutiliza sin volver
// a buscar. Si no, solo se reutiliza automáticamente por teléfono exacto
// (nunca solo por nombre, para no fusionar dos personas distintas).
export async function crearOReutilizarClienteMaestro({ nombre, telefono, clienteMaestroIdConfirmado }) {
  if (clienteMaestroIdConfirmado) return clienteMaestroIdConfirmado

  const digitos = soloDigitos(telefono)
  if (digitos.length >= 7) {
    const qTelefono = query(collection(db, 'clientesMaestro'), where('telefono', '==', digitos), limit(1))
    const snapTelefono = await getDocs(qTelefono)
    if (!snapTelefono.empty) return snapTelefono.docs[0].id
  }

  const ref = await addDoc(collection(db, 'clientesMaestro'), {
    nombre,
    nombreNormalizado: normalizarTexto(nombre).trim(),
    telefono: digitos || null,
    creadoEn: serverTimestamp(),
  })
  return ref.id
}
