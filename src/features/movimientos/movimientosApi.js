import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase/config'
import { actualizarVehiculo } from '../vehiculos/vehiculosApi'

async function subirArchivo(vehiculoId, archivo, carpeta) {
  const nombre = `${Date.now()}-${archivo.name}`
  const storageRef = ref(storage, `movimientos/${vehiculoId}/${carpeta}/${nombre}`)
  await uploadBytes(storageRef, archivo)
  return getDownloadURL(storageRef)
}

// fotos es obligatorio (al menos una), video y firma/documento son opcionales.
export async function registrarMovimiento({
  vehiculoId,
  tipo,
  quienRecibe,
  quienEntrega,
  motivo,
  fotos,
  video,
  documentoEscaneado,
}) {
  if (!fotos || fotos.length === 0) {
    throw new Error('Se requiere al menos una foto para registrar el movimiento.')
  }

  const fotosURLs = await Promise.all(fotos.map((f) => subirArchivo(vehiculoId, f, 'fotos')))
  const videoURL = video ? await subirArchivo(vehiculoId, video, 'video') : null
  const documentoURL = documentoEscaneado
    ? await subirArchivo(vehiculoId, documentoEscaneado, 'documentos')
    : null

  const movimientoRef = await addDoc(collection(db, 'movimientos'), {
    vehiculoId,
    tipo,
    quienRecibe,
    quienEntrega,
    motivo,
    fotos: fotosURLs,
    video: videoURL,
    firmaDigitalURL: null,
    documentoEscaneadoURL: documentoURL,
    fecha: serverTimestamp(),
    estado: 'activo',
  })

  await actualizarVehiculo(vehiculoId, {
    estado: tipo === 'entrega' ? 'prestado' : 'disponible',
    movimientoActualId: movimientoRef.id,
  })

  return movimientoRef.id
}

export async function listarMovimientosPorVehiculoEnRango(vehiculoId, desde, hasta) {
  const q = query(
    collection(db, 'movimientos'),
    where('vehiculoId', '==', vehiculoId),
    where('fecha', '>=', Timestamp.fromDate(desde)),
    where('fecha', '<=', Timestamp.fromDate(hasta))
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
