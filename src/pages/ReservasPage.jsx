import { useEffect, useMemo, useState } from 'react'
import { suscribirVehiculos } from '../features/vehiculos/vehiculosApi'
import { suscribirReservas, crearReserva, cancelarReserva, verificarDisponibilidad } from '../features/reservas/reservasApi'
import { suscribirPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { diasBloqueadosPorPicoYPlacaEnRango } from '../lib/picoYPlaca'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'

function formatoFechaHora(timestamp) {
  return timestamp.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function ReservasPage() {
  const [vehiculos, setVehiculos] = useState([])
  const [reservas, setReservas] = useState([])
  const [picoYPlacaConfig, setPicoYPlacaConfig] = useState(null)
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)

  const [vehiculoId, setVehiculoId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [quienTipo, setQuienTipo] = useState('comercial')
  const [quienNombre, setQuienNombre] = useState('')
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => suscribirReservas(setReservas), [])
  useEffect(() => suscribirPicoYPlacaConfig(setPicoYPlacaConfig), [])

  const vehiculosPorId = useMemo(() => Object.fromEntries(vehiculos.map((v) => [v.id, v])), [vehiculos])
  const reservasVisibles = reservas.filter((r) => mostrarCanceladas || r.estado === 'activa')

  async function handleCrear(e) {
    e.preventDefault()
    setMensaje('')
    if (!vehiculoId || !inicio || !fin) return

    const fechaInicio = new Date(inicio)
    const fechaFin = new Date(fin)

    if (fechaFin <= fechaInicio) {
      setMensaje('La hora de fin debe ser después de la hora de inicio.')
      return
    }

    setEnviando(true)
    try {
      const { disponible, conflictos } = await verificarDisponibilidad(vehiculoId, fechaInicio, fechaFin)
      if (!disponible) {
        const otra = conflictos[0]
        setMensaje(
          `Ese vehículo ya tiene una reserva de ${formatoFechaHora(otra.fechaInicio)} a ${formatoFechaHora(otra.fechaFin)} que se cruza con este horario.`
        )
        return
      }

      const vehiculo = vehiculosPorId[vehiculoId]
      const diasBloqueados = vehiculo ? diasBloqueadosPorPicoYPlacaEnRango(vehiculo, picoYPlacaConfig, fechaInicio, fechaFin) : []
      if (diasBloqueados.length > 0) {
        const continuar = window.confirm(
          `Este vehículo tiene pico y placa el ${diasBloqueados.map((d) => d.toLocaleDateString('es-CO')).join(', ')}. ¿Reservar de todas formas?`
        )
        if (!continuar) return
      }

      await crearReserva({
        vehiculoId,
        fechaInicio,
        fechaFin,
        solicitadoPor: { tipo: quienTipo, nombre: quienNombre },
        motivo,
      })
      setMensaje('Reserva creada.')
      setVehiculoId('')
      setInicio('')
      setFin('')
      setQuienNombre('')
      setMotivo('')
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  async function handleCancelar(reservaId) {
    if (!window.confirm('¿Cancelar esta reserva?')) return
    await cancelarReserva(reservaId)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Reservas de vehículos</h1>

      <form onSubmit={handleCrear} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Nueva reserva</h2>
        <select
          required
          value={vehiculoId}
          onChange={(e) => setVehiculoId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Selecciona vehículo</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.placa} {v.marcaModelo ? `— ${v.marcaModelo}` : ''}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              required
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              required
              type="datetime-local"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select value={quienTipo} onChange={(e) => setQuienTipo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
            <option value="comercial">Comercial</option>
            <option value="directivo">Directivo</option>
            <option value="cliente">Cliente</option>
          </select>
          <input
            required
            placeholder="Nombre de quién reserva"
            value={quienNombre}
            onChange={(e) => setQuienNombre(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          required
          placeholder="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={enviando} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {enviando ? 'Reservando…' : 'Reservar'}
        </button>
        {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Reservas</h2>
          <button onClick={() => setMostrarCanceladas((v) => !v)} className="text-xs text-gray-500 underline">
            {mostrarCanceladas ? 'Ocultar canceladas' : 'Ver canceladas'}
          </button>
        </div>
        {reservasVisibles.length === 0 && <p className="text-sm text-gray-500">No hay reservas.</p>}
        <ul className="space-y-2">
          {reservasVisibles.map((r) => {
            const vehiculo = vehiculosPorId[r.vehiculoId]
            return (
              <li key={r.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{vehiculo?.placa ?? 'Vehículo eliminado'}</p>
                  {r.estado === 'cancelada' ? (
                    <span className="text-xs rounded-full bg-gray-200 text-gray-600 px-3 py-1">Cancelada</span>
                  ) : (
                    <span className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-3 py-1">Activa</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {formatoFechaHora(r.fechaInicio)} → {formatoFechaHora(r.fechaFin)}
                </p>
                <p className="text-xs text-gray-500">
                  {r.solicitadoPor?.tipo}: {r.solicitadoPor?.nombre} · {r.motivo}
                </p>
                {r.estado === 'activa' && (
                  <button onClick={() => handleCancelar(r.id)} className="text-xs text-red-700 underline">
                    Cancelar reserva
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
