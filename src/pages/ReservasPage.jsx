import { useEffect, useMemo, useState } from 'react'
import { suscribirVehiculos } from '../features/vehiculos/vehiculosApi'
import {
  suscribirReservas,
  crearReserva,
  cancelarReserva,
  verificarDisponibilidad,
  barrerReservasVencidas,
} from '../features/reservas/reservasApi'
import { suscribirPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { suscribirUsuarios } from '../features/usuarios/usuariosApi'
import { diasBloqueadosPorPicoYPlacaEnRango } from '../lib/picoYPlaca'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { coincideBusqueda } from '../lib/texto'
import { INPUT } from '../lib/estilos'
import { useAuth } from '../context/AuthContext'
import Tarjeta from '../components/Tarjeta'
import Boton from '../components/Boton'
import Badge from '../components/Badge'
import Alerta from '../components/Alerta'
import Vacio from '../components/Vacio'
import BarraBusqueda from '../components/BarraBusqueda'

const ROLES_QUE_PUEDEN_GESTIONAR = ['admin', 'anfitriona', 'directivo']

function formatoFechaHora(timestamp) {
  return timestamp.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatoHora(timestamp) {
  return timestamp.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

const DIAS_SEMANA_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

function BadgeResultado({ reserva }) {
  if (reserva.estado === 'cancelada') return <Badge color="gray">Cancelada</Badge>
  if (reserva.resultado === 'pendiente') return <Badge color="emerald" dot>Activa</Badge>
  if (reserva.resultado === 'cumplida') return <Badge color="blue">Cumplida</Badge>
  if (reserva.resultado === 'incumplida') return <Badge color="red">Incumplida</Badge>
  return null
}

function CalendarioReservas({ reservas, vehiculosPorId }) {
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDate())

  const reservasActivas = useMemo(() => reservas.filter((r) => r.estado === 'activa'), [reservas])

  const reservasPorDia = useMemo(() => {
    const mapa = {}
    reservasActivas.forEach((r) => {
      const cursor = new Date(r.fechaInicio.toDate())
      cursor.setHours(0, 0, 0, 0)
      const finDia = new Date(r.fechaFin.toDate())
      finDia.setHours(0, 0, 0, 0)
      while (cursor <= finDia) {
        if (cursor.getFullYear() === mesActual.getFullYear() && cursor.getMonth() === mesActual.getMonth()) {
          const key = cursor.getDate()
          mapa[key] = mapa[key] ? [...mapa[key], r] : [r]
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    })
    return mapa
  }, [reservasActivas, mesActual])

  const primerDiaSemana = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).getDay()
  const totalDias = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate()
  const celdas = [...Array(primerDiaSemana).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)]

  const hoy = new Date()
  const esMesActual = hoy.getFullYear() === mesActual.getFullYear() && hoy.getMonth() === mesActual.getMonth()

  function cambiarMes(delta) {
    setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
  }

  return (
    <Tarjeta className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => cambiarMes(-1)} className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3 key={mesActual.toISOString()} className="text-sm font-semibold text-gray-900 capitalize animate-fade-in">
          {mesActual.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={() => cambiarMes(1)} className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 font-medium">
        {DIAS_SEMANA_CORTOS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div key={mesActual.toISOString() + '-grid'} className="grid grid-cols-7 gap-1 animate-fade-in">
        {celdas.map((d, i) =>
          d === null ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => setDiaSeleccionado(d)}
              className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 border p-0.5 transition-all duration-150 ${
                diaSeleccionado === d
                  ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                  : reservasPorDia[d]
                    ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                    : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
              } ${esMesActual && d === hoy.getDate() && diaSeleccionado !== d ? 'ring-1 ring-inset ring-gray-300 font-semibold' : ''}`}
            >
              <span>{d}</span>
              {reservasPorDia[d] && (
                <span className={`text-[9px] leading-none truncate max-w-full ${diaSeleccionado === d ? 'text-white/80' : 'text-amber-800'}`}>
                  {reservasPorDia[d].length === 1
                    ? vehiculosPorId[reservasPorDia[d][0].vehiculoId]?.placa
                    : `${reservasPorDia[d].length} autos`}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {diaSeleccionado && (
        <div key={`${mesActual.toISOString()}-${diaSeleccionado}`} className="border-t border-gray-100 pt-3 space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-gray-700 capitalize">
            {new Date(mesActual.getFullYear(), mesActual.getMonth(), diaSeleccionado).toLocaleDateString('es-CO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          {(reservasPorDia[diaSeleccionado] ?? []).length === 0 && <p className="text-xs text-gray-400">Sin reservas ese día.</p>}
          {(reservasPorDia[diaSeleccionado] ?? []).map((r) => (
            <div key={r.id} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <span className="font-medium text-gray-900">{vehiculosPorId[r.vehiculoId]?.placa ?? '—'}</span>{' '}
              {formatoHora(r.fechaInicio)}–{formatoHora(r.fechaFin)} · {r.solicitadoPor?.nombre}
              {r.motivo && ` (${r.motivo})`}
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  )
}

export default function ReservasPage() {
  const { rol } = useAuth()
  const puedeGestionar = ROLES_QUE_PUEDEN_GESTIONAR.includes(rol)
  const [vehiculos, setVehiculos] = useState([])
  const [reservas, setReservas] = useState([])
  const [picoYPlacaConfig, setPicoYPlacaConfig] = useState(null)
  const [comerciales, setComerciales] = useState([])
  const [directivos, setDirectivos] = useState([])
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const [vehiculoId, setVehiculoId] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [quienTipo, setQuienTipo] = useState('comercial')
  const [quienSeleccion, setQuienSeleccion] = useState('')
  const [quienNombreLibre, setQuienNombreLibre] = useState('')
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [vista, setVista] = useState('calendario')

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => suscribirReservas(setReservas), [])
  useEffect(() => suscribirPicoYPlacaConfig(setPicoYPlacaConfig), [])

  // Barrido perezoso: si alguien con permiso para gestionar reservas abre esta
  // pantalla, aprovechamos para marcar como incumplidas las que ya vencieron
  // sin que nadie registrara el movimiento correspondiente.
  useEffect(() => {
    if (!puedeGestionar || reservas.length === 0) return
    barrerReservasVencidas(reservas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeGestionar, reservas.length])
  useEffect(() => {
    return suscribirUsuarios((todos) => {
      setComerciales(todos.filter((u) => u.rol === 'comercial'))
      setDirectivos(todos.filter((u) => u.rol === 'directivo'))
    })
  }, [])

  const vehiculosPorId = useMemo(() => Object.fromEntries(vehiculos.map((v) => [v.id, v])), [vehiculos])
  const reservasVisibles = reservas.filter(
    (r) =>
      (mostrarCanceladas || r.estado === 'activa') &&
      coincideBusqueda(`${vehiculosPorId[r.vehiculoId]?.placa ?? ''} ${r.solicitadoPor?.nombre ?? ''}`, busqueda)
  )
  const listaPersonas = quienTipo === 'comercial' ? comerciales : quienTipo === 'directivo' ? directivos : []

  function handleCambiarQuienTipo(nuevoTipo) {
    setQuienTipo(nuevoTipo)
    setQuienSeleccion('')
    setQuienNombreLibre('')
  }

  function personaSeleccionada() {
    if (quienTipo === 'cliente') return { nombre: quienNombreLibre.trim(), uid: null }
    if (quienSeleccion === 'otro') return { nombre: quienNombreLibre.trim(), uid: null }
    const persona = listaPersonas.find((p) => p.id === quienSeleccion)
    return persona ? { nombre: persona.nombre, uid: persona.id } : { nombre: '', uid: null }
  }

  async function handleCrear(e) {
    e.preventDefault()
    setMensaje('')
    const { nombre: quienNombre, uid: quienUid } = personaSeleccionada()
    if (!vehiculoId || !inicio || !fin || !quienNombre) return

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
        solicitadoPor: { tipo: quienTipo, nombre: quienNombre, uid: quienUid },
        motivo: motivo.trim() || null,
      })
      setMensaje('Reserva creada.')
      setVehiculoId('')
      setInicio('')
      setFin('')
      setQuienSeleccion('')
      setQuienNombreLibre('')
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
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-lg font-semibold text-gray-900">Reservas de vehículos</h1>

      {!puedeGestionar && (
        <Alerta tipo="info">Puedes ver la disponibilidad de los vehículos aquí. Para reservar uno, pídeselo a la anfitriona.</Alerta>
      )}

      {puedeGestionar && (
        <Tarjeta className="p-4">
          <form onSubmit={handleCrear} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Nueva reserva</h2>
            <select required value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)} className={INPUT}>
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
                <input required type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input required type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="space-y-2">
              <select value={quienTipo} onChange={(e) => handleCambiarQuienTipo(e.target.value)} className={INPUT}>
                <option value="comercial">Comercial</option>
                <option value="cliente">Cliente</option>
                <option value="directivo">Directivo</option>
              </select>

              {quienTipo === 'cliente' ? (
                <input
                  required
                  placeholder="Nombre del cliente"
                  value={quienNombreLibre}
                  onChange={(e) => setQuienNombreLibre(e.target.value)}
                  className={`${INPUT} animate-slide-up`}
                />
              ) : (
                <div className="space-y-2 animate-slide-up">
                  <select required value={quienSeleccion} onChange={(e) => setQuienSeleccion(e.target.value)} className={INPUT}>
                    <option value="">Selecciona {quienTipo === 'comercial' ? 'comercial' : 'directivo'}</option>
                    {listaPersonas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                    <option value="otro">Otro (no está en la lista)</option>
                  </select>
                  {quienSeleccion === 'otro' && (
                    <input
                      required
                      placeholder="Nombre"
                      value={quienNombreLibre}
                      onChange={(e) => setQuienNombreLibre(e.target.value)}
                      className={`${INPUT} animate-slide-up`}
                    />
                  )}
                </div>
              )}
            </div>
            <input placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT} />
            <Boton type="submit" cargando={enviando}>
              {enviando ? 'Reservando…' : 'Reservar'}
            </Boton>
            <Alerta tipo="info">{mensaje}</Alerta>
          </form>
        </Tarjeta>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setVista('calendario')}
          className={`text-sm rounded-lg px-3 py-1.5 transition-colors ${
            vista === 'calendario' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          Calendario
        </button>
        <button
          onClick={() => setVista('lista')}
          className={`text-sm rounded-lg px-3 py-1.5 transition-colors ${
            vista === 'lista' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
          }`}
        >
          Lista
        </button>
      </div>

      {vista === 'calendario' && <CalendarioReservas reservas={reservas} vehiculosPorId={vehiculosPorId} />}

      {vista === 'lista' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Reservas</h2>
            <button onClick={() => setMostrarCanceladas((v) => !v)} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
              {mostrarCanceladas ? 'Ocultar canceladas' : 'Ver canceladas'}
            </button>
          </div>
          <BarraBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar por placa o persona..." />
          {reservasVisibles.length === 0 && (
            <Vacio titulo="No hay reservas" descripcion={busqueda ? `Nada coincide con "${busqueda}".` : undefined} />
          )}
          <ul className="space-y-2">
            {reservasVisibles.map((r, i) => {
              const vehiculo = vehiculosPorId[r.vehiculoId]
              return (
                <Tarjeta key={r.id} animar style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }} className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{vehiculo?.placa ?? 'Vehículo eliminado'}</p>
                    <BadgeResultado reserva={r} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatoFechaHora(r.fechaInicio)} → {formatoFechaHora(r.fechaFin)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.solicitadoPor?.tipo}: {r.solicitadoPor?.nombre}
                    {r.motivo && ` · ${r.motivo}`}
                  </p>
                  {puedeGestionar && r.estado === 'activa' && r.resultado === 'pendiente' && (
                    <button onClick={() => handleCancelar(r.id)} className="text-xs text-red-600 hover:text-red-800 transition-colors">
                      Cancelar reserva
                    </button>
                  )}
                </Tarjeta>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
