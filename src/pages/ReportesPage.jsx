import { useEffect, useMemo, useState } from 'react'
import { suscribirVehiculos } from '../features/vehiculos/vehiculosApi'
import { suscribirUsuarios } from '../features/usuarios/usuariosApi'
import { listarMovimientosEnRango } from '../features/movimientos/movimientosApi'
import { listarClientesEnRango } from '../features/clientes/clientesApi'
import { listarReservasEnRango } from '../features/reservas/reservasApi'
import { parseFechaLocal, fechaLocalYYYYMMDD } from '../lib/fechas'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { normalizarFotos } from '../lib/fotosVehiculo'
import { INPUT } from '../lib/estilos'
import {
  crearLibro,
  agregarHojaTabular,
  insertarMiniatura,
  celdaAdjunto,
  crearPresupuestoImagenes,
  descargarLibro,
  ALTO_FILA_DATOS,
} from '../lib/excel'
import Tarjeta from '../components/Tarjeta'
import Boton from '../components/Boton'
import Alerta from '../components/Alerta'
import { IconoReporte, IconoDescarga } from '../lib/iconos'

const LABELS_LADO = { frente: 'Frente', lateralIzq: 'Lateral Izq', lateralDer: 'Lateral Der', trasero: 'Trasero', kilometraje: 'Kilometraje' }

// Columnas de adjuntos compartidas entre el reporte de movimientos y el de
// reservas (una reserva cumplida hereda las fotos de su movimiento vinculado).
function columnasAdjuntos() {
  return [
    { header: 'Frente', key: 'frente', width: 13 },
    { header: 'Lateral Izq', key: 'lateralIzq', width: 13 },
    { header: 'Lateral Der', key: 'lateralDer', width: 13 },
    { header: 'Trasero', key: 'trasero', width: 13 },
    { header: 'Kilometraje', key: 'kilometraje', width: 13 },
    { header: 'Documento', key: 'documento', width: 13 },
    { header: 'Video', key: 'video', width: 13 },
    { header: 'Otras fotos (registros anteriores)', key: 'otras', width: 24 },
  ]
}

// Si algo puntual sale mal escribiendo los adjuntos de una fila (una URL
// rara, una imagen corrupta que igual pasó las validaciones previas, etc.)
// no debe tumbar el reporte completo — esa fila simplemente queda con lo que
// alcanzó a escribir antes de fallar.
async function escribirAdjuntos(libro, hoja, fila, columnas, movimiento, presupuesto) {
  try {
    await escribirAdjuntosInterno(libro, hoja, fila, columnas, movimiento, presupuesto)
  } catch (err) {
    console.error('No se pudieron escribir los adjuntos de una fila del reporte:', err)
  }
}

async function escribirAdjuntosInterno(libro, hoja, fila, columnas, movimiento, presupuesto) {
  const fotos = normalizarFotos(movimiento?.fotos)

  for (const lado of ['frente', 'lateralIzq', 'lateralDer', 'trasero', 'kilometraje']) {
    const col = columnas.findIndex((c) => c.key === lado)
    const url = fotos[lado]
    celdaAdjunto(hoja, fila, col, url, LABELS_LADO[lado])
    if (url) await insertarMiniatura(libro, hoja, fila, col, url, presupuesto)
  }

  const colDocumento = columnas.findIndex((c) => c.key === 'documento')
  celdaAdjunto(hoja, fila, colDocumento, movimiento?.documentoEscaneadoURL, 'Ver documento')
  if (movimiento?.documentoEscaneadoURL) await insertarMiniatura(libro, hoja, fila, colDocumento, movimiento.documentoEscaneadoURL, presupuesto)

  const colVideo = columnas.findIndex((c) => c.key === 'video')
  celdaAdjunto(hoja, fila, colVideo, movimiento?.video, 'Ver video')

  // Un hipervínculo de Excel solo puede apuntar a una URL — si hay varias
  // fotos "otras" (formato viejo, sin ángulo), el enlace y la miniatura son
  // de la primera nada más. La etiqueta lo dice explícitamente para no dar a
  // entender que el clic muestra las demás.
  const colOtras = columnas.findIndex((c) => c.key === 'otras')
  if (fotos.otras.length > 0) {
    const etiqueta = fotos.otras.length === 1 ? 'Ver foto' : `Foto 1 de ${fotos.otras.length}`
    celdaAdjunto(hoja, fila, colOtras, fotos.otras[0], etiqueta)
    await insertarMiniatura(libro, hoja, fila, colOtras, fotos.otras[0], presupuesto)
  } else {
    celdaAdjunto(hoja, fila, colOtras, null)
  }
}

const TIPOS_REPORTE = [
  {
    id: 'movimientos',
    label: 'Movimientos de vehículos',
    descripcion: 'Entregas y recepciones registradas, con fotos y documentos adjuntos.',
  },
  {
    id: 'clientes',
    label: 'Clientes por comercial',
    descripcion: 'Clientes atendidos por cada comercial, efectivos y descartados.',
  },
  {
    id: 'reservas',
    label: 'Reservas y vehículos por comercial/directivo',
    descripcion: 'Reservas hechas por comerciales y directivos, con el resultado y evidencia de entrega.',
  },
]

function primeroDelMesPasado() {
  const hoy = new Date()
  const hace30 = new Date(hoy)
  hace30.setDate(hoy.getDate() - 30)
  return hace30
}

function formatoFechaHora(timestamp) {
  return timestamp.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

async function construirReporteMovimientos(libro, { desde, hasta, vehiculoId, vehiculosPorId }) {
  const movimientos = (await listarMovimientosEnRango(desde, hasta))
    .filter((m) => !vehiculoId || m.vehiculoId === vehiculoId)
    .sort((a, b) => a.fecha.toDate() - b.fecha.toDate())

  const columnas = [
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Placa', key: 'placa', width: 12 },
    { header: 'Vehículo', key: 'vehiculo', width: 22 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Quién recibe', key: 'quienRecibe', width: 22 },
    { header: 'Quién entrega', key: 'quienEntrega', width: 22 },
    { header: 'Motivo', key: 'motivo', width: 24 },
    ...columnasAdjuntos(),
  ]
  const hoja = agregarHojaTabular(libro, 'Movimientos', columnas)
  const presupuesto = crearPresupuestoImagenes()

  for (const m of movimientos) {
    const vehiculo = vehiculosPorId[m.vehiculoId]
    const fila = hoja.addRow({
      fecha: formatoFechaHora(m.fecha),
      placa: vehiculo?.placa ?? '—',
      vehiculo: vehiculo?.marcaModelo ?? '',
      tipo: m.tipo === 'entrega' ? 'Entrega' : 'Recepción',
      quienRecibe: m.quienRecibe?.nombre || 'N/A',
      quienEntrega: m.quienEntrega?.nombre || 'N/A',
      motivo: m.motivo ?? '',
    }).number
    hoja.getRow(fila).height = ALTO_FILA_DATOS

    await escribirAdjuntos(libro, hoja, fila, columnas, m, presupuesto)
  }

  return movimientos.length
}

async function construirReporteClientes(libro, { desde, hasta, comercialId, usuariosPorId }) {
  const clientes = (await listarClientesEnRango(desde, hasta))
    .filter((c) => !comercialId || c.comercialAsignadoId === comercialId)
    .sort((a, b) => a.fechaHora.toDate() - b.fechaHora.toDate())

  const columnas = [
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Comercial', key: 'comercial', width: 22 },
    { header: 'Cliente', key: 'cliente', width: 22 },
    { header: 'Teléfono', key: 'telefono', width: 16 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Pidió específico', key: 'especifico', width: 15 },
    { header: 'Efectivo', key: 'efectivo', width: 12 },
    { header: 'Motivo descarte', key: 'motivoDescarte', width: 24 },
  ]
  const hoja = agregarHojaTabular(libro, 'Clientes', columnas)

  for (const c of clientes) {
    hoja.addRow({
      fecha: formatoFechaHora(c.fechaHora),
      comercial: usuariosPorId[c.comercialAsignadoId]?.nombre ?? '—',
      cliente: c.nombre,
      telefono: c.telefono ?? '',
      tipo: c.tipo === 'nuevo' ? 'Nuevo' : 'Recurrente',
      especifico: c.comercialSolicitado ? 'Sí' : 'No',
      efectivo: c.efectivo ? 'Sí' : 'No',
      motivoDescarte: c.efectivo ? '' : (c.motivoDescarte ?? ''),
    })
  }

  return clientes.length
}

async function construirReporteReservas(libro, { desde, hasta, personaId, vehiculosPorId }) {
  const [reservas, movimientos] = await Promise.all([
    listarReservasEnRango(desde, hasta),
    listarMovimientosEnRango(desde, hasta),
  ])
  const movimientosPorId = Object.fromEntries(movimientos.map((m) => [m.id, m]))

  const reservasFiltradas = reservas
    .filter((r) => r.solicitadoPor?.uid && (!personaId || r.solicitadoPor.uid === personaId))
    .sort((a, b) => a.fechaInicio.toDate() - b.fechaInicio.toDate())

  const columnas = [
    { header: 'Persona', key: 'persona', width: 22 },
    { header: 'Rol', key: 'rol', width: 12 },
    { header: 'Placa', key: 'placa', width: 12 },
    { header: 'Vehículo', key: 'vehiculo', width: 20 },
    { header: 'Inicio', key: 'inicio', width: 18 },
    { header: 'Fin', key: 'fin', width: 18 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Resultado', key: 'resultado', width: 12 },
    { header: 'Motivo', key: 'motivo', width: 22 },
    ...columnasAdjuntos(),
  ]
  const hoja = agregarHojaTabular(libro, 'Reservas', columnas)
  const presupuesto = crearPresupuestoImagenes()

  const ROTULO_ESTADO = { activa: 'Activa', cancelada: 'Cancelada' }
  const ROTULO_RESULTADO = { pendiente: 'Pendiente', cumplida: 'Cumplida', incumplida: 'Incumplida' }

  for (const r of reservasFiltradas) {
    const vehiculo = vehiculosPorId[r.vehiculoId]
    const movimiento = r.movimientoId ? movimientosPorId[r.movimientoId] : null
    const fila = hoja.addRow({
      persona: r.solicitadoPor?.nombre ?? '',
      rol: r.solicitadoPor?.tipo === 'comercial' ? 'Comercial' : 'Directivo',
      placa: vehiculo?.placa ?? '—',
      vehiculo: vehiculo?.marcaModelo ?? '',
      inicio: formatoFechaHora(r.fechaInicio),
      fin: formatoFechaHora(r.fechaFin),
      estado: ROTULO_ESTADO[r.estado] ?? r.estado,
      resultado: ROTULO_RESULTADO[r.resultado] ?? r.resultado,
      motivo: r.motivo ?? '',
    }).number
    hoja.getRow(fila).height = ALTO_FILA_DATOS

    await escribirAdjuntos(libro, hoja, fila, columnas, movimiento, presupuesto)
  }

  return reservasFiltradas.length
}

export default function ReportesPage() {
  const [vehiculos, setVehiculos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [tipoReporte, setTipoReporte] = useState('movimientos')
  const [entidadId, setEntidadId] = useState('')
  const [desde, setDesde] = useState(fechaLocalYYYYMMDD(primeroDelMesPasado()))
  const [hasta, setHasta] = useState(fechaLocalYYYYMMDD())
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => suscribirUsuarios(setUsuarios), [])

  const vehiculosPorId = useMemo(() => Object.fromEntries(vehiculos.map((v) => [v.id, v])), [vehiculos])
  const usuariosPorId = useMemo(() => Object.fromEntries(usuarios.map((u) => [u.id, u])), [usuarios])
  const comerciales = useMemo(() => usuarios.filter((u) => u.rol === 'comercial'), [usuarios])
  const comercialesYDirectivos = useMemo(() => usuarios.filter((u) => u.rol === 'comercial' || u.rol === 'directivo'), [usuarios])

  function handleCambiarTipo(id) {
    setTipoReporte(id)
    setEntidadId('')
    setMensaje('')
  }

  async function handleGenerar(e) {
    e.preventDefault()
    setMensaje('')

    const fechaDesde = parseFechaLocal(desde)
    const fechaHasta = parseFechaLocal(hasta)
    fechaHasta.setHours(23, 59, 59, 999)

    if (fechaHasta < fechaDesde) {
      setMensaje('La fecha "hasta" debe ser igual o posterior a "desde".')
      return
    }

    setGenerando(true)
    try {
      const libro = crearLibro()
      let filas = 0
      let nombreBase = ''

      if (tipoReporte === 'movimientos') {
        filas = await construirReporteMovimientos(libro, { desde: fechaDesde, hasta: fechaHasta, vehiculoId: entidadId, vehiculosPorId })
        nombreBase = entidadId ? `Movimientos_${vehiculosPorId[entidadId]?.placa ?? entidadId}` : 'Movimientos_todos_los_vehiculos'
      } else if (tipoReporte === 'clientes') {
        filas = await construirReporteClientes(libro, { desde: fechaDesde, hasta: fechaHasta, comercialId: entidadId, usuariosPorId })
        nombreBase = entidadId ? `Clientes_${usuariosPorId[entidadId]?.nombre ?? entidadId}` : 'Clientes_todos_los_comerciales'
      } else {
        filas = await construirReporteReservas(libro, { desde: fechaDesde, hasta: fechaHasta, personaId: entidadId, vehiculosPorId })
        nombreBase = entidadId ? `Reservas_${usuariosPorId[entidadId]?.nombre ?? entidadId}` : 'Reservas_todos'
      }

      if (filas === 0) {
        setMensaje('No hay datos para ese rango y esa selección.')
        return
      }

      const nombreArchivo = `${nombreBase.replace(/\s+/g, '_')}_${desde}_a_${hasta}.xlsx`
      await descargarLibro(libro, nombreArchivo)
      setMensaje(`Reporte generado: ${filas} registro${filas === 1 ? '' : 's'}.`)
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-lg font-semibold text-gray-900">Reportes</h1>

      <Tarjeta className="p-4 space-y-4">
        <div className="space-y-2">
          {TIPOS_REPORTE.map((t) => (
            <label
              key={t.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                tipoReporte === t.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={tipoReporte === t.id}
                onChange={() => handleCambiarTipo(t.id)}
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{t.label}</span>
                <span className="block text-xs text-gray-500">{t.descripcion}</span>
              </span>
            </label>
          ))}
        </div>

        <form onSubmit={handleGenerar} className="space-y-3 pt-2 border-t border-gray-100">
          {tipoReporte === 'movimientos' && (
            <select value={entidadId} onChange={(e) => setEntidadId(e.target.value)} className={`${INPUT} animate-slide-up`}>
              <option value="">Todos los vehículos</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} {v.marcaModelo ? `— ${v.marcaModelo}` : ''}
                </option>
              ))}
            </select>
          )}
          {tipoReporte === 'clientes' && (
            <select value={entidadId} onChange={(e) => setEntidadId(e.target.value)} className={`${INPUT} animate-slide-up`}>
              <option value="">Todos los comerciales</option>
              {comerciales.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          )}
          {tipoReporte === 'reservas' && (
            <select value={entidadId} onChange={(e) => setEntidadId(e.target.value)} className={`${INPUT} animate-slide-up`}>
              <option value="">Todos (comerciales y directivos)</option>
              {comercialesYDirectivos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.rol === 'comercial' ? 'Comercial' : 'Directivo'})
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input required type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input required type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={INPUT} />
            </div>
          </div>

          <Boton type="submit" cargando={generando} className="w-full">
            {!generando && <IconoDescarga className="w-4 h-4" />}
            {generando ? 'Generando…' : 'Generar Excel'}
          </Boton>
          <Alerta tipo={mensaje.startsWith('Reporte generado') ? 'exito' : 'info'}>{mensaje}</Alerta>
        </form>
      </Tarjeta>

      <div className="flex items-start gap-2.5 text-xs text-gray-400 px-1">
        <IconoReporte className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Cada foto y el documento firmado tienen su propia columna (Frente, Lateral Izq, Lateral Der, Trasero, Kilometraje, Documento) con
          la miniatura incrustada cuando se puede descargar, y siempre con un hipervínculo a la foto original — el video queda como
          hipervínculo (no se puede incrustar en una celda). Lo que no aplica queda como "N/A".
        </p>
      </div>
    </div>
  )
}
