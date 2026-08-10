import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase/config'
import { actualizarVehiculo } from '../vehiculos/vehiculosApi'
import { marcarReservaCumplida } from '../reservas/reservasApi'

async function subirArchivo(vehiculoId, archivo, carpeta) {
  const nombre = `${Date.now()}-${archivo.name}`
  const storageRef = ref(storage, `movimientos/${vehiculoId}/${carpeta}/${nombre}`)
  await uploadBytes(storageRef, archivo)
  return getDownloadURL(storageRef)
}

// fotos es obligatorio (al menos una), video y firma/documento son opcionales.
// reservaId es opcional: solo viene cuando el registro nace de una reserva de
// comercial/directivo (no cuando anfitriona/admin lo hacen directo con un cliente).
export async function registrarMovimiento({
  vehiculoId,
  tipo,
  quienRecibe,
  quienEntrega,
  motivo,
  fotos,
  video,
  documentoEscaneado,
  reservaId,
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
    reservaId: reservaId ?? null,
    fecha: serverTimestamp(),
    estado: 'activo',
  })

  await actualizarVehiculo(vehiculoId, {
    estado: tipo === 'entrega' ? 'prestado' : 'disponible',
    movimientoActualId: movimientoRef.id,
    quienTiene: tipo === 'entrega' ? quienRecibe : null,
  })

  if (reservaId && tipo === 'entrega') {
    await marcarReservaCumplida(reservaId, movimientoRef.id)
  }

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
