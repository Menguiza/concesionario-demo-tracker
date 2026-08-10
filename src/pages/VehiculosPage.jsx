import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { suscribirVehiculos, crearVehiculo } from '../features/vehiculos/vehiculosApi'
import { registrarMovimiento } from '../features/movimientos/movimientosApi'
import { suscribirPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { estaBloqueadoPorPicoYPlaca, diasBloqueadosPorPicoYPlacaEnRango } from '../lib/picoYPlaca'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { parseFechaLocal } from '../lib/fechas'
import { useAuth } from '../context/AuthContext'

const PATRON_PLACA = /^[A-Z]{3}[0-9]{3}$/

function EstadoBadge({ vehiculo, picoYPlacaConfig }) {
  const bloqueado = estaBloqueadoPorPicoYPlaca(vehiculo, picoYPlacaConfig)
  if (vehiculo.estado === 'prestado') return <span className="text-xs rounded-full bg-amber-100 text-amber-800 px-3 py-1">Prestado</span>
  if (bloqueado) return <span className="text-xs rounded-full bg-red-100 text-red-800 px-3 py-1">Pico y placa hoy</span>
  return <span className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-3 py-1">Disponible</span>
}

function ConsultaPicoYPlacaRapida({ vehiculo, picoYPlacaConfig }) {
  const [desde, setDesde] = useState(null)
  const [hasta, setHasta] = useState(null)
  const [mostrarRango, setMostrarRango] = useState(false)

  const hoy = new Date()
  const manana = new Date(hoy)
  manana.setDate(hoy.getDate() + 1)

  function chequearUnDia(dia) {
    setDesde(dia)
    setHasta(dia)
    setMostrarRango(false)
  }

  const diasBloqueados = desde && hasta ? diasBloqueadosPorPicoYPlacaEnRango(vehiculo, picoYPlacaConfig, desde, hasta) : null
  const esUnSoloDia = desde && hasta && desde.getTime() === hasta.getTime()

  return (
    <div className="mt-2 space-y-1 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-400">¿Pico y placa?</span>
        <button onClick={() => chequearUnDia(hoy)} className="rounded-full border border-gray-300 px-2 py-1 text-gray-600">
          Hoy
        </button>
        <button onClick={() => chequearUnDia(manana)} className="rounded-full border border-gray-300 px-2 py-1 text-gray-600">
          Mañana
        </button>
        <button onClick={() => setMostrarRango((v) => !v)} className="rounded-full border border-gray-300 px-2 py-1 text-gray-600">
          Varios días
        </button>
      </div>

      {mostrarRango && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            onChange={(e) => e.target.value && setDesde(parseFechaLocal(e.target.value))}
            className="rounded border border-gray-300 px-1 py-0.5 text-gray-600"
          />
          <span className="text-gray-400">hasta</span>
          <input
            type="date"
            onChange={(e) => e.target.value && setHasta(parseFechaLocal(e.target.value))}
            className="rounded border border-gray-300 px-1 py-0.5 text-gray-600"
          />
        </div>
      )}

      {diasBloqueados !== null && (
        <p className={`font-medium ${diasBloqueados.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
          {vehiculo.esElectricoHibrido
            ? 'Exento (eléctrico/híbrido)'
            : diasBloqueados.length > 0
              ? `Pico y placa: ${diasBloqueados.map((d) => d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })).join(', ')}`
              : esUnSoloDia
                ? `Libre el ${desde.toLocaleDateString('es-CO')}`
                : `Libre todo el rango (${desde.toLocaleDateString('es-CO')} – ${hasta.toLocaleDateString('es-CO')})`}
        </p>
      )}
    </div>
  )
}

function FormularioMovimiento({ vehiculo, picoYPlacaConfig, onCerrar }) {
  const { perfil } = useAuth()
  const tipo = vehiculo.estado === 'prestado' ? 'recepcion' : 'entrega'
  const [quienNombre, setQuienNombre] = useState('')
  const [quienTipo, setQuienTipo] = useState('comercial')
  const [motivo, setMotivo] = useState('')
  const [fotos, setFotos] = useState([])
  const [video, setVideo] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const bloqueadoPorPicoYPlaca = tipo === 'entrega' && estaBloqueadoPorPicoYPlaca(vehiculo, picoYPlacaConfig)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (bloqueadoPorPicoYPlaca) {
      const continuar = window.confirm(
        `${vehiculo.placa} tiene pico y placa hoy. Solo continúa si tienes autorización explícita para usarlo de todas formas. ¿Confirmas que sí?`
      )
      if (!continuar) return
    }

    setEnviando(true)
    try {
      await registrarMovimiento({
        vehiculoId: vehiculo.id,
        tipo,
        quienRecibe: tipo === 'entrega' ? { tipo: quienTipo, nombre: quienNombre } : { tipo: 'anfitriona', nombre: perfil?.nombre },
        quienEntrega: tipo === 'entrega' ? { tipo: 'anfitriona', nombre: perfil?.nombre } : { tipo: quienTipo, nombre: quienNombre },
        motivo,
        fotos,
        video,
        documentoEscaneado: documento,
      })
      onCerrar()
    } catch (err) {
      setError(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3 bg-gray-50 rounded-lg p-3">
      <p className="text-sm font-medium text-gray-900">
        Vas a registrar: {tipo === 'entrega' ? 'Entrega del vehículo' : 'Recepción del vehículo'}
      </p>
      {bloqueadoPorPicoYPlaca && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          Este vehículo tiene pico y placa hoy. Al guardar te vamos a pedir confirmación de que tienes autorización.
        </p>
      )}
      <div className="flex gap-2">
        <select value={quienTipo} onChange={(e) => setQuienTipo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
          <option value="comercial">Comercial</option>
          <option value="cliente">Cliente</option>
          <option value="directivo">Directivo</option>
        </select>
        <input
          required
          placeholder="Nombre"
          value={quienNombre}
          onChange={(e) => setQuienNombre(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        required
        placeholder="Motivo (test drive, demora en entrega, autorización directivo…)"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div>
        <label className="block text-xs text-gray-500 mb-1">Fotos (obligatorio, varios ángulos + kilometraje)</label>
        <input
          required
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => setFotos(Array.from(e.target.files))}
          className="text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Video (opcional)</label>
        <input type="file" accept="video/*" capture="environment" onChange={(e) => setVideo(e.target.files[0] ?? null)} className="text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Documento firmado escaneado (opcional)</label>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setDocumento(e.target.files[0] ?? null)} className="text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCerrar} className="text-sm text-gray-500">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function VehiculosPage() {
  const { rol } = useAuth()
  const [vehiculos, setVehiculos] = useState([])
  const [picoYPlacaConfig, setPicoYPlacaConfig] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const [nuevaPlaca, setNuevaPlaca] = useState('')
  const [nuevoModelo, setNuevoModelo] = useState('')
  const [nuevoElectrico, setNuevoElectrico] = useState(false)
  const [errorVehiculo, setErrorVehiculo] = useState('')

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => suscribirPicoYPlacaConfig(setPicoYPlacaConfig), [])

  function handlePlacaChange(valor) {
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setNuevaPlaca(limpio)
  }

  async function handleCrearVehiculo(e) {
    e.preventDefault()
    setErrorVehiculo('')
    const placaNormalizada = nuevaPlaca.trim().toUpperCase()
    if (!PATRON_PLACA.test(placaNormalizada)) {
      setErrorVehiculo('La placa debe tener el formato ABC123: 3 letras seguidas de 3 números.')
      return
    }
    const yaExiste = vehiculos.some((v) => v.placa.trim().toUpperCase() === placaNormalizada)
    if (yaExiste) {
      setErrorVehiculo(`Ya existe un vehículo con la placa ${placaNormalizada}.`)
      return
    }
    try {
      await crearVehiculo({ placa: placaNormalizada, marcaModelo: nuevoModelo, esElectricoHibrido: nuevoElectrico })
      setNuevaPlaca('')
      setNuevoModelo('')
      setNuevoElectrico(false)
    } catch (err) {
      setErrorVehiculo(mensajeErrorAmigable(err))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Vehículos</h1>

      <ul className="space-y-3">
        {vehiculos.map((v) => (
          <li key={v.id} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{v.placa}</p>
                <p className="text-xs text-gray-500">
                  {v.marcaModelo} {v.esElectricoHibrido && '· eléctrico/híbrido'}
                </p>
              </div>
              <EstadoBadge vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} />
            </div>
            <ConsultaPicoYPlacaRapida vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} />
            <div className="mt-2 flex gap-3 text-sm">
              <button onClick={() => setExpandido(expandido === v.id ? null : v.id)} className="text-gray-900 underline">
                Registrar movimiento
              </button>
              <Link to="/reservas" className="text-gray-500 underline">
                Ver / crear reservas
              </Link>
            </div>
            {expandido === v.id && (
              <FormularioMovimiento vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} onCerrar={() => setExpandido(null)} />
            )}
          </li>
        ))}
      </ul>

      {rol === 'admin' && (
        <form onSubmit={handleCrearVehiculo} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Agregar vehículo</h2>
          <div>
            <input
              required
              placeholder="Ej: ABC123"
              value={nuevaPlaca}
              onChange={(e) => handlePlacaChange(e.target.value)}
              maxLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
            />
            <p className="text-xs text-gray-400 mt-1">Formato: 3 letras + 3 números, sin espacios ni guion (ej: ABC123).</p>
          </div>
          <input
            placeholder="Marca / modelo"
            value={nuevoModelo}
            onChange={(e) => setNuevoModelo(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={nuevoElectrico} onChange={(e) => setNuevoElectrico(e.target.checked)} />
            Es eléctrico o híbrido (exento de pico y placa)
          </label>
          {errorVehiculo && <p className="text-sm text-red-600">{errorVehiculo}</p>}
          <button type="submit" className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm">
            Agregar
          </button>
        </form>
      )}
    </div>
  )
}
