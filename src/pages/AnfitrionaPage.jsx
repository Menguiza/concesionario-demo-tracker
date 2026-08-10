import { useEffect, useMemo, useState } from 'react'
import { suscribirEquipos, suscribirEstadoSemana, fijarEquipoActivo } from '../features/equipos/equiposApi'
import { suscribirUsuarios, marcarLlegadaHoy } from '../features/usuarios/usuariosApi'
import {
  suscribirColaEquipo,
  inicializarColaSemana,
  actualizarOrden,
  marcarOcupado,
  establecerClienteActual,
} from '../features/cola/colaApi'
import { registrarCliente, marcarDescarte, contarClientesEfectivosEnRango } from '../features/clientes/clientesApi'
import { construirOrdenInicial, elegirYRotar, asignarComercialEspecifico, pasarSinConsumirCola } from '../lib/queue'
import { estaEnHorario } from '../lib/horario'
import { rangoSemanaPasada, fechaLocalYYYYMMDD } from '../lib/fechas'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { MOTIVOS_DESCARTE } from '../lib/motivosDescarte'

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
  const [mostrarCambioEquipo, setMostrarCambioEquipo] = useState(false)

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

  const comercialesActivosEquipo = useMemo(
    () => comercialesEquipo.filter((c) => c.activo !== false),
    [comercialesEquipo]
  )

  // El orden de la cola se fija al iniciar semana y no se actualiza solo si
  // después cambian los miembros del equipo (se agrega o se quita a alguien).
  // Esto lo mantiene sincronizado: agrega al final a quien entra, saca a
  // quien ya no está o quedó inactivo.
  useEffect(() => {
    if (!cola || !equipoActivoId) return
    const idsEquipoActivo = new Set(comercialesActivosEquipo.map((c) => c.id))
    const ordenActual = cola.orden ?? []
    const faltaAlguienEnOrden = comercialesActivosEquipo.some((c) => !ordenActual.includes(c.id))
    const sobraAlguienEnOrden = ordenActual.some((id) => !idsEquipoActivo.has(id))
    if (!faltaAlguienEnOrden && !sobraAlguienEnOrden) return

    const nuevosMiembros = [...idsEquipoActivo].filter((id) => !ordenActual.includes(id))
    const nuevoOrden = [...ordenActual.filter((id) => idsEquipoActivo.has(id)), ...nuevosMiembros]
    actualizarOrden(equipoActivoId, nuevoOrden)
  }, [cola, comercialesActivosEquipo, equipoActivoId])

  const comercialesPorId = useMemo(
    () => Object.fromEntries(comercialesEquipo.map((c) => [c.id, c])),
    [comercialesEquipo]
  )

  async function handleIniciarSemana(equipoId) {
    const { desde, hasta } = rangoSemanaPasada()
    const equipo = equipos.find((e) => e.id === equipoId)
    const miembros = usuarios.filter((u) => equipo.miembros.includes(u.id) && u.activo !== false)

    if (miembros.length === 0) {
      setMensaje(`El equipo "${equipo.nombre}" todavía no tiene comerciales activos asignados.`)
      return
    }

    const hoy = fechaLocalYYYYMMDD()

    try {
      const conteos = await Promise.all(
        miembros.map(async (m) => ({
          id: m.id,
          clientesEfectivosSemanaPasada: await contarClientesEfectivosEnRango(m.id, desde, hasta),
          horaLlegadaHoy: m.ultimaLlegada?.fecha === hoy ? m.ultimaLlegada.horaISO : null,
        }))
      )

      const orden = construirOrdenInicial(conteos)
      await fijarEquipoActivo(equipoId)
      await inicializarColaSemana(equipoId, orden)
      setMensaje(`Semana iniciada con el equipo "${equipo.nombre}".`)
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
    }
  }

  function idsEnHorarioAhora() {
    return new Set(
      comercialesEquipo.filter((c) => c.activo !== false && estaEnHorario(c.horarioSemanal)).map((c) => c.id)
    )
  }

  // A quién le tocaría el próximo cliente si se asigna "normal" ahora mismo
  // (no aplica si el próximo cliente pide un comercial específico).
  const proximoEnRecibir = cola?.orden
    ? elegirYRotar(cola.orden, new Set(cola.ocupados ?? []), idsEnHorarioAhora()).elegido
    : null

  async function ocuparConCliente(comercialId, clienteId) {
    const ocupadosActuales = cola.ocupados ?? []
    await marcarOcupado(equipoActivoId, comercialId, true, ocupadosActuales)
    await establecerClienteActual(equipoActivoId, comercialId, clienteId, cola.clienteActual ?? {})
  }

  async function handleAsignar(e) {
    e.preventDefault()
    setMensaje('')
    if (!cola || !equipoActivoId) return

    try {
      if (pideEspecifico && comercialEspecificoId) {
        const nuevoOrden =
          tipoCliente === 'nuevo'
            ? asignarComercialEspecifico(cola.orden, comercialEspecificoId)
            : pasarSinConsumirCola(cola.orden)

        const clienteRef = await registrarCliente({
          nombre: nombreCliente,
          telefono: telefonoCliente,
          tipo: tipoCliente,
          comercialAsignadoId: comercialEspecificoId,
          comercialSolicitado: true,
        })
        if (tipoCliente === 'nuevo') await actualizarOrden(equipoActivoId, nuevoOrden)
        await ocuparConCliente(comercialEspecificoId, clienteRef.id)
        setMensaje(`Cliente asignado a ${comercialesPorId[comercialEspecificoId]?.nombre ?? 'comercial'}.`)
      } else {
        const idsOcupados = new Set(cola.ocupados ?? [])
        const { elegido, nuevoOrden } = elegirYRotar(cola.orden, idsOcupados, idsEnHorarioAhora())
        if (!elegido) {
          setMensaje('No hay comerciales disponibles en este momento.')
          return
        }
        const clienteRef = await registrarCliente({
          nombre: nombreCliente,
          telefono: telefonoCliente,
          tipo: tipoCliente,
          comercialAsignadoId: elegido,
          comercialSolicitado: false,
        })
        await actualizarOrden(equipoActivoId, nuevoOrden)
        await ocuparConCliente(elegido, clienteRef.id)
        setMensaje(`Cliente asignado a ${comercialesPorId[elegido]?.nombre ?? 'comercial'}.`)
      }
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
      return
    }

    setNombreCliente('')
    setTelefonoCliente('')
    setTipoCliente('nuevo')
    setPideEspecifico(false)
    setComercialEspecificoId('')
  }

  const [resolviendoId, setResolviendoId] = useState(null)
  const [mostrandoMotivoId, setMostrandoMotivoId] = useState(null)
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_DESCARTE[0])

  async function toggleOcupado(comercialId) {
    const ocupadosActuales = cola.ocupados ?? []
    const yaOcupado = ocupadosActuales.includes(comercialId)
    const clienteActualId = cola.clienteActual?.[comercialId]

    if (yaOcupado && clienteActualId) {
      setResolviendoId(comercialId)
      setMostrandoMotivoId(null)
      return
    }

    await marcarOcupado(equipoActivoId, comercialId, !yaOcupado, ocupadosActuales)
  }

  async function resolverYLiberar(comercialId, esEfectivo) {
    const clienteActualId = cola.clienteActual?.[comercialId]
    if (!esEfectivo) {
      await marcarDescarte(clienteActualId, motivoSeleccionado)
    }
    await marcarOcupado(equipoActivoId, comercialId, false, cola.ocupados ?? [])
    await establecerClienteActual(equipoActivoId, comercialId, null, cola.clienteActual ?? {})
    setResolviendoId(null)
    setMostrandoMotivoId(null)
    setMotivoSeleccionado(MOTIVOS_DESCARTE[0])
  }

  async function handleMarcarLlegada(comercialId) {
    await marcarLlegadaHoy(comercialId)
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
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (window.confirm('Esto borra quién está ocupado y las llegadas de hoy, y recalcula el orden desde cero. ¿Continuar?')) {
                handleIniciarSemana(equipoActivoId)
              }
            }}
            className="text-sm text-gray-500 underline"
          >
            Reiniciar orden de la semana
          </button>
          <button onClick={() => setMostrarCambioEquipo((v) => !v)} className="text-sm text-gray-500 underline">
            Cambiar equipo
          </button>
        </div>
      </div>

      {mostrarCambioEquipo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-amber-800">
            Esto reemplaza la cola actual con la del equipo elegido, recalculada desde cero. Úsalo solo si el equipo activo quedó mal asignado.
          </p>
          <div className="flex gap-2 flex-wrap">
            {equipos
              .filter((e) => e.id !== equipoActivoId)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={async () => {
                    if (!window.confirm(`¿Cambiar a "${e.nombre}"? Se pierde el progreso de la cola actual.`)) return
                    await handleIniciarSemana(e.id)
                    setMostrarCambioEquipo(false)
                  }}
                  className="rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-sm text-amber-900"
                >
                  {e.nombre}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600 space-y-1">
        <p>
          <strong>Siguiente:</strong> el comercial marcado en azul es quien va a recibir el próximo cliente si le das "Asignar" ahora
          mismo (sin pedir uno específico).
        </p>
        <p>
          <strong>Ocupado / Disponible:</strong> se marca solo cuando le asignas un cliente. Para liberarlo vas a tener que decir si ese
          cliente fue efectivo o no. Si necesitas marcarlo ocupado por otro motivo (ausente, etc.) puedes hacerlo manual, y ahí sí se libera
          directo, sin preguntar nada.
        </p>
      </div>

      <ol className="space-y-2">
        {(cola?.orden ?? []).map((id, i) => {
          const comercial = comercialesPorId[id]
          const ocupado = cola.ocupados?.includes(id)
          const enHorario = comercial ? estaEnHorario(comercial.horarioSemanal) : false
          const llegada = comercial?.ultimaLlegada?.fecha === fechaLocalYYYYMMDD() ? comercial.ultimaLlegada : null
          const esSiguiente = id === proximoEnRecibir
          return (
            <li
              key={id}
              className={`rounded-lg border px-3 py-3 space-y-2 ${
                esSiguiente ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {i + 1}. {comercial?.nombre ?? id}
                </p>
                {esSiguiente && (
                  <span className="text-xs rounded-full bg-blue-600 text-white px-2 py-0.5 shrink-0">Siguiente</span>
                )}
              </div>
              {!enHorario && <p className="text-xs text-gray-400">Fuera de su horario de hoy</p>}

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">
                  {llegada
                    ? `Llegó hoy a las ${new Date(llegada.horaISO).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Todavía no ha marcado llegada hoy'}
                </span>
                {!llegada && (
                  <button
                    onClick={() => handleMarcarLlegada(id)}
                    className="text-xs rounded-lg border border-gray-300 px-2 py-1 text-gray-700 shrink-0"
                  >
                    Ya llegó, registrar
                  </button>
                )}
              </div>

              {resolviendoId === id ? (
                <div className="bg-gray-50 rounded-lg p-2 space-y-2">
                  <p className="text-xs text-gray-700">¿El cliente que atendió fue efectivo?</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => resolverYLiberar(id, true)}
                      className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-3 py-1"
                    >
                      Sí, efectivo
                    </button>
                    <button
                      onClick={() => setMostrandoMotivoId(id)}
                      className="text-xs rounded-full bg-gray-200 text-gray-700 px-3 py-1"
                    >
                      No fue efectivo
                    </button>
                  </div>
                  {mostrandoMotivoId === id && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={motivoSeleccionado}
                        onChange={(e) => setMotivoSeleccionado(e.target.value)}
                        className="text-xs rounded-lg border border-gray-300 px-2 py-1"
                      >
                        {MOTIVOS_DESCARTE.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => resolverYLiberar(id, false)} className="text-xs text-red-700 underline">
                        Confirmar y liberar
                      </button>
                    </div>
                  )}
                  <button onClick={() => setResolviendoId(null)} className="text-xs text-gray-400 underline">
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">{ocupado ? 'Atendiendo a un cliente ahora' : 'Puede recibir un cliente'}</span>
                  <button
                    onClick={() => toggleOcupado(id)}
                    className={`text-xs rounded-full px-3 py-1 shrink-0 ${ocupado ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
                  >
                    {ocupado ? 'Marcar libre' : 'Marcar ocupado'}
                  </button>
                </div>
              )}
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
            {comercialesActivosEquipo.map((c) => (
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
