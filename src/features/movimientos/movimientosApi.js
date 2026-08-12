import { collection, addDoc, doc, getDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../firebase/config'
import { actualizarVehiculo } from '../vehiculos/vehiculosApi'
import {
  marcarReservaCumplida,
  marcarReservaOmitida,
  marcarDevolucionCompletada,
  marcarDevolucionIncumplida,
} from '../reservas/reservasApi'
import { fotosFaltantes } from '../../lib/fotosVehiculo'

async function subirArchivo(vehiculoId, archivo, carpeta) {
  const nombre = `${Date.now()}-${archivo.name}`
  const storageRef = ref(storage, `movimientos/${vehiculoId}/${carpeta}/${nombre}`)
  await uploadBytes(storageRef, archivo)
  return getDownloadURL(storageRef)
}

// fotos es un objeto { frente, lateralIzq, lateralDer, trasero, kilometraje },
// las 5 son obligatorias; video y firma/documento son opcionales. reservaId es
// opcional: solo viene cuando el registro nace de una reserva de
// comercial/directivo (no cuando anfitriona/admin lo hacen directo con un cliente).
// responsable identifica a quién le queda la responsabilidad del préstamo
// (copiado de la reserva, para que reportes no tengan que hacer join).
// omitido=true salta fotos/documento — quien recibe renunció a dejar
// constancia del estado del vehículo (botón "Omitir registro").
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
  responsable = null,
  omitido = false,
}) {
  if (!omitido) {
    const faltantes = fotosFaltantes(fotos)
    if (faltantes.length > 0) {
      throw new Error(`Faltan fotos obligatorias: ${faltantes.map((f) => f.label).join(', ')}.`)
    }
  }

  const fotosURLs = omitido
    ? {}
    : Object.fromEntries(
        await Promise.all(
          Object.entries(fotos).map(async ([lado, archivo]) => [lado, await subirArchivo(vehiculoId, archivo, `fotos/${lado}`)])
        )
      )
  const videoURL = !omitido && video ? await subirArchivo(vehiculoId, video, 'video') : null
  const documentoURL = !omitido && documentoEscaneado
    ? await subirArchivo(vehiculoId, documentoEscaneado, 'documentos')
    : null

  // Se lee el estado del vehículo y su movimiento actual ANTES de
  // sobreescribirlos, para poder saber si esta entrega "reemplaza" un
  // préstamo anterior sin devolución registrada, o si esta recepción cierra
  // la reserva que estaba abierta.
  const vehiculoSnap = await getDoc(doc(db, 'vehiculos', vehiculoId))
  const vehiculoActual = vehiculoSnap.exists() ? vehiculoSnap.data() : null
  let movimientoAnterior = null
  if (vehiculoActual?.movimientoActualId) {
    const snapAnterior = await getDoc(doc(db, 'movimientos', vehiculoActual.movimientoActualId))
    movimientoAnterior = snapAnterior.exists() ? snapAnterior.data() : null
  }

  const movimientoRef = await addDoc(collection(db, 'movimientos'), {
    vehiculoId,
    tipo,
    quienRecibe,
    quienEntrega,
    motivo,
    responsable: responsable ?? null,
    omitido: !!omitido,
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

  // Reemplazo: el vehículo seguía prestado (nadie devolvió) y ahora se
  // presta de nuevo — la reserva anterior queda con la devolución incumplida.
  if (tipo === 'entrega' && vehiculoActual?.estado === 'prestado' && movimientoAnterior?.reservaId && movimientoAnterior.reservaId !== reservaId) {
    await marcarDevolucionIncumplida(movimientoAnterior.reservaId)
  }

  if (reservaId && tipo === 'entrega') {
    await (omitido ? marcarReservaOmitida : marcarReservaCumplida)(reservaId, movimientoRef.id)
  }

  if (tipo === 'recepcion' && movimientoAnterior?.reservaId) {
    await marcarDevolucionCompletada(movimientoAnterior.reservaId, movimientoRef.id)
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

// Todos los movimientos (de cualquier vehículo) en el rango — para reportes.
// Un solo filtro por rango; el filtrado por vehículo o persona específica se
// hace en el cliente para no depender de un índice compuesto.
export async function listarMovimientosEnRango(desde, hasta) {
  const q = query(
    collection(db, 'movimientos'),
    where('fecha', '>=', Timestamp.fromDate(desde)),
    where('fecha', '<=', Timestamp.fromDate(hasta))
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
