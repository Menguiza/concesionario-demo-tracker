import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { suscribirVehiculos } from '../features/vehiculos/vehiculosApi'
import { suscribirReservas, suscribirReservasDeUsuario } from '../features/reservas/reservasApi'
import { suscribirEquipos, suscribirEstadoSemana } from '../features/equipos/equiposApi'
import { suscribirColaEquipo } from '../features/cola/colaApi'
import { suscribirUsuarios } from '../features/usuarios/usuariosApi'
import { elegirYRotar } from '../lib/queue'
import { estaEnHorario } from '../lib/horario'
import { fechaLocalYYYYMMDD } from '../lib/fechas'
import { seccionesDeRol } from '../lib/navegacion'
import { IconoLlave, IconoReloj, IconoCola, IconoVehiculos, IconoReservas, IconoFlechaDerecha } from '../lib/iconos'
import Tarjeta from '../components/Tarjeta'
import Badge from '../components/Badge'

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function primerNombre(nombre) {
  return nombre?.trim().split(/\s+/)[0] ?? ''
}

function formatoFechaHora(timestamp) {
  return timestamp.toDate().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatoHora(timestamp) {
  return timestamp.toDate().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function EncabezadoWidget({ icono: Icono, titulo, children }) {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <Icono className="w-4 h-4" />
      <p className="text-xs font-medium uppercase tracking-wide">{titulo}</p>
      {children}
    </div>
  )
}

function TarjetaVehiculoEnMano({ vehiculos, uid }) {
  const vehiculo = vehiculos.find((v) => v.quienTiene?.uid === uid)
  return (
    <Tarjeta animar className="p-4 space-y-2">
      <EncabezadoWidget icono={IconoLlave} titulo="Vehículo en tus manos" />
      {vehiculo ? (
        <div className="space-y-1">
          <p className="text-lg font-semibold text-gray-900 tracking-wide">{vehiculo.placa}</p>
          <p className="text-xs text-gray-500">{vehiculo.marcaModelo}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No tienes ningún vehículo asignado ahora mismo.</p>
      )}
      <Link to="/vehiculos" className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors inline-block">
        {vehiculo ? 'Registrar devolución' : 'Ver vehículos'}
      </Link>
    </Tarjeta>
  )
}

function TarjetaProximaReserva({ uid }) {
  const [reservas, setReservas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  useEffect(() => suscribirReservasDeUsuario(uid, setReservas), [uid])
  useEffect(() => suscribirVehiculos(setVehiculos), [])

  const ahora = new Date()
  const proxima = reservas
    .filter((r) => r.estado === 'activa' && r.resultado === 'pendiente' && r.fechaFin.toDate() > ahora)
    .sort((a, b) => a.fechaInicio.toDate() - b.fechaInicio.toDate())[0]

  const vehiculo = proxima ? vehiculos.find((v) => v.id === proxima.vehiculoId) : null
  const enCurso = proxima && ahora >= proxima.fechaInicio.toDate()

  return (
    <Tarjeta animar className="p-4 space-y-2">
      <EncabezadoWidget icono={IconoReloj} titulo={enCurso ? 'Reserva en curso' : 'Tu próxima reserva'} />
      {proxima ? (
        <div className="space-y-1">
          <p className="text-lg font-semibold text-gray-900 tracking-wide">{vehiculo?.placa ?? '—'}</p>
          <p className="text-xs text-gray-500">{enCurso ? `Hasta las ${formatoHora(proxima.fechaFin)}` : formatoFechaHora(proxima.fechaInicio)}</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No tienes reservas próximas.</p>
      )}
      <Link to="/reservas" className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors inline-block">
        Ver reservas
      </Link>
    </Tarjeta>
  )
}

// Estado de la fila para un comercial puntual: en qué equipo/cola activa
// está, si le toca ahora o está atendiendo a alguien. Se autogestiona sus
// propias suscripciones para no acoplar al dashboard general.
function TarjetaEstadoCola({ uid }) {
  const [equipos, setEquipos] = useState([])
  const [estadoSemana, setEstadoSemana] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cola, setCola] = useState(null)

  useEffect(() => suscribirEquipos(setEquipos), [])
  useEffect(() => suscribirEstadoSemana(setEstadoSemana), [])
  useEffect(() => suscribirUsuarios(setUsuarios), [])

  const equipoActivoId = estadoSemana?.equipoActivoId ?? null
  const miEquipo = equipos.find((e) => e.id === equipoActivoId && e.miembros.includes(uid))
  const miEquipoId = miEquipo?.id ?? null

  useEffect(() => {
    if (!miEquipoId) {
      setCola(null)
      return
    }
    return suscribirColaEquipo(miEquipoId, setCola)
  }, [miEquipoId])

  if (!miEquipo || !cola) {
    return (
      <Tarjeta animar className="p-4 space-y-2">
        <EncabezadoWidget icono={IconoCola} titulo="Fila de hoy" />
        <p className="text-sm text-gray-400">No estás en el equipo activo de esta semana.</p>
      </Tarjeta>
    )
  }

  const ocupado = cola.ocupados?.includes(uid)
  const clienteActual = cola.clienteActual?.[uid]
  const comercialesEquipo = usuarios.filter((u) => miEquipo.miembros.includes(u.id) && u.activo !== false)
  const idsEnHorario = new Set(comercialesEquipo.filter((c) => estaEnHorario(c.horarioSemanal)).map((c) => c.id))
  const { elegido } = elegirYRotar(cola.orden ?? [], new Set(cola.ocupados ?? []), idsEnHorario)
  const esSiguiente = elegido === uid
  const posicion = (cola.orden ?? []).indexOf(uid) + 1

  return (
    <Tarjeta animar className={`p-4 space-y-2 ${esSiguiente && !ocupado ? 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/40' : ''}`}>
      <div className="flex items-center justify-between">
        <EncabezadoWidget icono={IconoCola} titulo="Fila de hoy" />
        {esSiguiente && !ocupado && <Badge color="blue">Siguiente</Badge>}
      </div>
      {ocupado ? (
        <p className="text-sm text-gray-900">
          {clienteActual ? (
            <>
              Estás atendiendo a <strong>{clienteActual.nombre}</strong>
            </>
          ) : (
            'Estás marcado como ocupado.'
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-900">
          {esSiguiente ? 'Eres el siguiente en recibir un cliente.' : `Disponible — posición ${posicion || '—'} en la fila.`}
        </p>
      )}
    </Tarjeta>
  )
}

function TarjetaColaOperativa() {
  const [equipos, setEquipos] = useState([])
  const [estadoSemana, setEstadoSemana] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cola, setCola] = useState(null)

  useEffect(() => suscribirEquipos(setEquipos), [])
  useEffect(() => suscribirEstadoSemana(setEstadoSemana), [])
  useEffect(() => suscribirUsuarios(setUsuarios), [])

  const equipoActivoId = estadoSemana?.equipoActivoId ?? null
  const equipoActivo = equipos.find((e) => e.id === equipoActivoId)

  useEffect(() => {
    if (!equipoActivoId) {
      setCola(null)
      return
    }
    return suscribirColaEquipo(equipoActivoId, setCola)
  }, [equipoActivoId])

  if (!equipoActivo) {
    return (
      <Tarjeta animar className="p-4 space-y-2">
        <EncabezadoWidget icono={IconoCola} titulo="Cola" />
        <p className="text-sm text-gray-400">No hay un equipo activo esta semana.</p>
        <Link to="/anfitriona" className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors inline-block">
          Iniciar semana
        </Link>
      </Tarjeta>
    )
  }

  const ocupados = cola?.ocupados?.length ?? 0
  const total = cola?.orden?.length ?? 0
  const comercialesEquipo = usuarios.filter((u) => equipoActivo.miembros.includes(u.id) && u.activo !== false)
  const idsEnHorario = new Set(comercialesEquipo.filter((c) => estaEnHorario(c.horarioSemanal)).map((c) => c.id))
  const { elegido } = cola ? elegirYRotar(cola.orden ?? [], new Set(cola.ocupados ?? []), idsEnHorario) : { elegido: null }
  const siguienteNombre = usuarios.find((u) => u.id === elegido)?.nombre

  return (
    <Tarjeta animar className="p-4 space-y-2">
      <EncabezadoWidget icono={IconoCola} titulo={`Cola — ${equipoActivo.nombre}`} />
      <p className="text-sm text-gray-900">
        {total - ocupados} disponible{total - ocupados === 1 ? '' : 's'} de {total}
      </p>
      {siguienteNombre && (
        <p className="text-xs text-gray-500">
          Siguiente: <span className="text-gray-700 font-medium">{siguienteNombre}</span>
        </p>
      )}
      <Link to="/anfitriona" className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors inline-block">
        Ir a la fila
      </Link>
    </Tarjeta>
  )
}

function TarjetaVehiculosResumen({ vehiculos }) {
  const disponibles = vehiculos.filter((v) => v.estado === 'disponible').length
  const enUso = vehiculos.filter((v) => v.estado === 'prestado').length
  return (
    <Tarjeta animar className="p-4 space-y-2">
      <EncabezadoWidget icono={IconoVehiculos} titulo="Vehículos" />
      <p className="text-sm text-gray-900">
        {disponibles} disponible{disponibles === 1 ? '' : 's'} · {enUso} en uso
      </p>
      <Link to="/vehiculos" className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors inline-block">
        Ver flota
      </Link>
    </Tarjeta>
  )
}

function TarjetaReservasHoy({ reservas, vehiculosPorId }) {
  const hoy = fechaLocalYYYYMMDD()
  const deHoy = reservas.filter((r) => r.estado === 'activa' && fechaLocalYYYYMMDD(r.fechaInicio.toDate()) === hoy)

  return (
    <Tarjeta animar className="p-4 space-y-2">
      <EncabezadoWidget icono={IconoReservas} titulo="Reservas de hoy" />
      {deHoy.length === 0 ? (
        <p className="text-sm text-gray-400">No hay reservas programadas para hoy.</p>
      ) : (
        <ul className="space-y-1">
          {deHoy.slice(0, 4).map((r) => (
            <li key={r.id} className="text-xs text-gray-600">
              <span className="font-medium text-gray-900">{vehiculosPorId[r.vehiculoId]?.placa ?? '—'}</span> {formatoHora(r.fechaInicio)} ·{' '}
              {r.solicitadoPor?.nombre}
            </li>
          ))}
        </ul>
      )}
      <Link to="/reservas" className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors inline-block">
        Ver calendario
      </Link>
    </Tarjeta>
  )
}

function AccesosRapidos({ rol }) {
  const secciones = seccionesDeRol(rol)
  if (secciones.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Accesos rápidos</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {secciones.map((s, i) => (
          <Link key={s.to} to={s.to}>
            <Tarjeta interactiva animar style={{ animationDelay: `${i * 40}ms` }} className="p-3.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
                <s.icono className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">{s.label}</span>
              <IconoFlechaDerecha className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
            </Tarjeta>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { perfil, rol, firebaseUser } = useAuth()
  const [vehiculos, setVehiculos] = useState([])
  const [reservas, setReservas] = useState([])

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => {
    if (rol !== 'admin' && rol !== 'gerente' && rol !== 'anfitriona') return
    return suscribirReservas(setReservas)
  }, [rol])

  const vehiculosPorId = useMemo(() => Object.fromEntries(vehiculos.map((v) => [v.id, v])), [vehiculos])

  if (!firebaseUser || !rol) return null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-sm text-gray-400">{saludo()}</p>
        <h1 className="text-xl font-semibold text-gray-900">{primerNombre(perfil?.nombre)}</h1>
      </div>

      {rol === 'comercial' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TarjetaEstadoCola uid={firebaseUser.uid} />
          <TarjetaVehiculoEnMano vehiculos={vehiculos} uid={firebaseUser.uid} />
          <TarjetaProximaReserva uid={firebaseUser.uid} />
        </div>
      )}

      {rol === 'directivo' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TarjetaVehiculoEnMano vehiculos={vehiculos} uid={firebaseUser.uid} />
          <TarjetaProximaReserva uid={firebaseUser.uid} />
        </div>
      )}

      {(rol === 'admin' || rol === 'gerente' || rol === 'anfitriona') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TarjetaColaOperativa />
          <TarjetaVehiculosResumen vehiculos={vehiculos} />
          <TarjetaReservasHoy reservas={reservas} vehiculosPorId={vehiculosPorId} />
        </div>
      )}

      <AccesosRapidos rol={rol} />
    </div>
  )
}
