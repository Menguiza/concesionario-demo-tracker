import { useEffect, useMemo, useState } from 'react'
import { suscribirEquipos, suscribirEstadoSemana, fijarEquipoActivo } from '../features/equipos/equiposApi'
import { suscribirUsuarios } from '../features/usuarios/usuariosApi'
import {
  suscribirColaEquipo,
  inicializarColaSemana,
  actualizarOrden,
  marcarOcupado,
  registrarLlegada,
} from '../features/cola/colaApi'
import { registrarCliente, contarClientesEfectivosEnRango } from '../features/clientes/clientesApi'
import { construirOrdenInicial, elegirYRotar, asignarComercialEspecifico, pasarSinConsumirCola } from '../lib/queue'
import { estaEnHorario } from '../lib/horario'
import { rangoSemanaPasada } from '../lib/fechas'

export default function AnfitrionaPage() {
  const [equipos, setEquipos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [estadoSemana, setEstadoSemana] = useState(null)
  const [cola, setCola] = useState(null)
  const [mensaje, setMensaje] = useState('')

  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [tipoCliente, setTipoCliente] = useState('nuevo')
  const [pideEspecifico, setPideEspecifico] = useState(false)
  const [comercialEspecificoId, setComercialEspecificoId] = useState('')

  useEffect(() => suscribirEquipos(setEquipos), [])
  useEffect(() => suscribirUsuarios(setUsuarios), [])
  useEffect(() => suscribirEstadoSemana(setEstadoSemana), [])

  const equipoActivoId = estadoSemana?.equipoActivoId ?? null

  useEffect(() => {
    if (!equipoActivoId) {
      setCola(null)
      return
    }
    return suscribirColaEquipo(equipoActivoId, setCola)
  }, [equipoActivoId])

  const comercialesEquipo = useMemo(() => {
    const equipo = equipos.find((e) => e.id === equipoActivoId)
    if (!equipo) return []
    return usuarios.filter((u) => equipo.miembros.includes(u.id))
  }, [equipos, usuarios, equipoActivoId])

  const comercialesPorId = useMemo(
    () => Object.fromEntries(comercialesEquipo.map((c) => [c.id, c])),
    [comercialesEquipo]
  )

  async function handleIniciarSemana(equipoId) {
    const { desde, hasta } = rangoSemanaPasada()
    const equipo = equipos.find((e) => e.id === equipoId)
    const miembros = usuarios.filter((u) => equipo.miembros.includes(u.id))

    const conteos = await Promise.all(
      miembros.map(async (m) => ({
        id: m.id,
        clientesEfectivosSemanaPasada: await contarClientesEfectivosEnRango(m.id, desde, hasta),
        horaLlegadaHoy: null,
      }))
    )

    const orden = construirOrdenInicial(conteos)
    await fijarEquipoActivo(equipoId)
    await inicializarColaSemana(equipoId, orden)
    setMensaje(`Semana iniciada con el equipo "${equipo.nombre}".`)
  }

  function idsEnHorarioAhora() {
    return new Set(comercialesEquipo.filter((c) => estaEnHorario(c.horarioSemanal)).map((c) => c.id))
  }

  async function handleAsignar(e) {
    e.preventDefault()
    setMensaje('')
    if (!cola || !equipoActivoId) return

    if (pideEspecifico && comercialEspecificoId) {
      const nuevoOrden =
        tipoCliente === 'nuevo'
          ? asignarComercialEspecifico(cola.orden, comercialEspecificoId)
          : pasarSinConsumirCola(cola.orden)

      await registrarCliente({
        nombre: nombreCliente,
        telefono: telefonoCliente,
        tipo: tipoCliente,
        comercialAsignadoId: comercialEspecificoId,
        comercialSolicitado: true,
      })
      if (tipoCliente === 'nuevo') await actualizarOrden(equipoActivoId, nuevoOrden)
      setMensaje(`Cliente asignado a ${comercialesPorId[comercialEspecificoId]?.nombre ?? 'comercial'}.`)
    } else {
      const idsOcupados = new Set(cola.ocupados ?? [])
      const { elegido, nuevoOrden } = elegirYRotar(cola.orden, idsOcupados, idsEnHorarioAhora())
      if (!elegido) {
        setMensaje('No hay comerciales disponibles en este momento.')
        return
      }
      await registrarCliente({
        nombre: nombreCliente,
        telefono: telefonoCliente,
        tipo: tipoCliente,
        comercialAsignadoId: elegido,
        comercialSolicitado: false,
      })
      await actualizarOrden(equipoActivoId, nuevoOrden)
      setMensaje(`Cliente asignado a ${comercialesPorId[elegido]?.nombre ?? 'comercial'}.`)
    }

    setNombreCliente('')
    setTelefonoCliente('')
    setTipoCliente('nuevo')
    setPideEspecifico(false)
    setComercialEspecificoId('')
  }

  async function toggleOcupado(comercialId) {
    const ocupadosActuales = cola.ocupados ?? []
    const yaOcupado = ocupadosActuales.includes(comercialId)
    if (!yaOcupado && !cola.llegadas?.[comercialId]) {
      await registrarLlegada(equipoActivoId, comercialId, cola.llegadas ?? {})
    }
    await marcarOcupado(equipoActivoId, comercialId, !yaOcupado, ocupadosActuales)
  }

  if (!equipoActivoId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">Iniciar semana</h1>
        <p className="text-sm text-gray-600">Selecciona el equipo que atiende esta semana.</p>
        <div className="flex gap-2 flex-wrap">
          {equipos.map((e) => (
            <button
              key={e.id}
              onClick={() => handleIniciarSemana(e.id)}
              className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm"
            >
              {e.nombre}
            </button>
          ))}
        </div>
        {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
      </div>
    )
  }

  const equipoActivo = equipos.find((e) => e.id === equipoActivoId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Cola — {equipoActivo?.nombre}</h1>
        <button onClick={() => handleIniciarSemana(equipoActivoId)} className="text-sm text-gray-500 underline">
          Reiniciar orden de la semana
        </button>
      </div>

      <ol className="space-y-2">
        {(cola?.orden ?? []).map((id, i) => {
          const comercial = comercialesPorId[id]
          const ocupado = cola.ocupados?.includes(id)
          const enHorario = comercial ? estaEnHorario(comercial.horarioSemanal) : false
          return (
            <li
              key={id}
              className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2"
            >
              <span className="text-sm text-gray-900">
                {i + 1}. {comercial?.nombre ?? id} {!enHorario && <span className="text-gray-400">(fuera de horario)</span>}
              </span>
              <button
                onClick={() => toggleOcupado(id)}
                className={`text-xs rounded-full px-3 py-1 ${ocupado ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
              >
                {ocupado ? 'Ocupado' : 'Disponible'}
              </button>
            </li>
          )
        })}
      </ol>

      <form onSubmit={handleAsignar} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Registrar cliente</h2>
        <input
          required
          placeholder="Nombre del cliente"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Teléfono (opcional)"
          value={telefonoCliente}
          onChange={(e) => setTelefonoCliente(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" checked={tipoCliente === 'nuevo'} onChange={() => setTipoCliente('nuevo')} />
            Nuevo
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={tipoCliente === 'recurrente'} onChange={() => setTipoCliente('recurrente')} />
            Recurrente
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pideEspecifico} onChange={(e) => setPideEspecifico(e.target.checked)} />
          Pide un comercial específico
        </label>
        {pideEspecifico && (
          <select
            required
            value={comercialEspecificoId}
            onChange={(e) => setComercialEspecificoId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Selecciona comercial</option>
            {comercialesEquipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
        <button type="submit" className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-medium">
          Asignar
        </button>
        {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
      </form>
    </div>
  )
}
