import { useEffect, useMemo, useState } from 'react'
import { suscribirEquipos, suscribirEstadoSemana, fijarEquipoActivo, avanzarEquipoDelDia } from '../features/equipos/equiposApi'
import { suscribirUsuarios, marcarLlegadaHoy } from '../features/usuarios/usuariosApi'
import {
  suscribirColaEquipo,
  inicializarColaSemana,
  actualizarOrden,
  marcarOcupado,
  establecerClienteActual,
} from '../features/cola/colaApi'
import { registrarCliente, marcarDescarte, contarClientesEfectivosEnRango } from '../features/clientes/clientesApi'
import { construirOrdenInicial, elegirYRotar, elegirEquipoDelDia, asignarComercialEspecifico, pasarSinConsumirCola } from '../lib/queue'
import { estaEnHorario } from '../lib/horario'
import { esDiaHabil, diaHabilAnterior, pasosHabilesDesde } from '../lib/diasHabiles'
import { fechaLocalYYYYMMDD, parseFechaLocal } from '../lib/fechas'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { MOTIVOS_DESCARTE } from '../lib/motivosDescarte'
import { enlaceTel } from '../lib/telefono'
import { INPUT } from '../lib/estilos'
import Tarjeta from '../components/Tarjeta'
import Boton from '../components/Boton'
import Badge from '../components/Badge'
import Alerta from '../components/Alerta'

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

  // Para "pide un comercial específico": cualquier comercial activo, no solo
  // los del equipo de hoy — un cliente puede buscar puntualmente a alguien de
  // otro equipo. Si es de otro equipo, la asignación no toca la cola de este
  // equipo (esa rotación no le aplica a él).
  const comercialesTodos = useMemo(() => usuarios.filter((u) => u.rol === 'comercial' && u.activo !== false), [usuarios])
  const comercialesTodosPorId = useMemo(
    () => Object.fromEntries(comercialesTodos.map((c) => [c.id, c])),
    [comercialesTodos]
  )
  function nombreEquipoDe(comercialId) {
    return equipos.find((e) => e.miembros.includes(comercialId))?.nombre
  }

  // El orden interno de un equipo se calcula con los clientes efectivos que
  // atendió cada quien el día hábil inmediatamente anterior (no la semana
  // completa) — se usa tanto al fijar el equipo a mano como en la rotación
  // automática de abajo, para que ambos caminos calculen igual.
  async function calcularYAplicarOrden(equipoId, hoy, { esAncla }) {
    const equipo = equipos.find((e) => e.id === equipoId)
    const miembros = usuarios.filter((u) => equipo.miembros.includes(u.id) && u.activo !== false)

    if (miembros.length === 0) {
      setMensaje(`El equipo "${equipo.nombre}" todavía no tiene comerciales activos asignados.`)
      return
    }

    const diaReferencia = diaHabilAnterior(hoy)
    const inicioDia = new Date(diaReferencia)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(diaReferencia)
    finDia.setHours(23, 59, 59, 999)
    const hoyStr = fechaLocalYYYYMMDD(hoy)

    const conteos = await Promise.all(
      miembros.map(async (m) => ({
        id: m.id,
        clientesEfectivosDiaAnterior: await contarClientesEfectivosEnRango(m.id, inicioDia, finDia),
        horaLlegadaHoy: m.ultimaLlegada?.fecha === hoyStr ? m.ultimaLlegada.horaISO : null,
      }))
    )

    const orden = construirOrdenInicial(conteos)
    if (esAncla) {
      await fijarEquipoActivo(equipoId, hoyStr)
    } else {
      await avanzarEquipoDelDia(equipoId, hoyStr)
    }
    await inicializarColaSemana(equipoId, orden)
    return equipo
  }

  async function handleIniciarSemana(equipoId) {
    try {
      const equipo = await calcularYAplicarOrden(equipoId, new Date(), { esAncla: true })
      if (equipo) setMensaje(`Semana iniciada con el equipo "${equipo.nombre}".`)
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
    }
  }

  // Rotación automática: si ya pasó a un nuevo día hábil desde la última vez
  // que se calculó equipo+orden, se alterna solo al equipo que le toca hoy
  // (contando cuántos días hábiles pasaron desde el ancla) — sin que nadie
  // tenga que acordarse de darle "Cambiar equipo" cada mañana. Igual que el
  // barrido de reservas vencidas, corre perezoso al abrir la pantalla.
  useEffect(() => {
    if (!estadoSemana?.equipoInicialId || !estadoSemana?.fechaInicioNegocio) return
    if (equipos.length === 0 || usuarios.length === 0) return
    const hoy = new Date()
    if (!esDiaHabil(hoy)) return
    const hoyStr = fechaLocalYYYYMMDD(hoy)
    if (estadoSemana.ultimoDiaActivado === hoyStr) return

    const pasos = pasosHabilesDesde(parseFechaLocal(estadoSemana.fechaInicioNegocio), hoy)
    const equipoDelDiaId = elegirEquipoDelDia(equipos, estadoSemana.equipoInicialId, pasos)
    calcularYAplicarOrden(equipoDelDiaId, hoy, { esAncla: false }).catch((err) => setMensaje(mensajeErrorAmigable(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoSemana?.ultimoDiaActivado, estadoSemana?.equipoInicialId, estadoSemana?.fechaInicioNegocio, equipos.length, usuarios.length])

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

  async function ocuparConCliente(comercialId, cliente) {
    const ocupadosActuales = cola.ocupados ?? []
    await marcarOcupado(equipoActivoId, comercialId, true, ocupadosActuales)
    await establecerClienteActual(equipoActivoId, comercialId, cliente, cola.clienteActual ?? {})
  }

  async function handleAsignar(e) {
    e.preventDefault()
    setMensaje('')
    if (!cola || !equipoActivoId) return

    try {
      if (pideEspecifico && comercialEspecificoId) {
        const persona = comercialesTodosPorId[comercialEspecificoId]
        if (!estaEnHorario(persona?.horarioSemanal)) {
          setMensaje(`${persona?.nombre ?? 'Ese comercial'} no está en su horario ahorita, no se le puede asignar.`)
          return
        }

        const esDelEquipoActivo = comercialesActivosEquipo.some((c) => c.id === comercialEspecificoId)

        if (esDelEquipoActivo) {
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
          await ocuparConCliente(comercialEspecificoId, { id: clienteRef.id, nombre: nombreCliente })
          setMensaje(`Cliente asignado a ${persona.nombre}.`)
        } else {
          // Es de otro equipo: no participa de la cola de hoy, así que no se
          // toca orden/ocupados/clienteActual de este equipo — solo queda
          // registrado como su cliente.
          await registrarCliente({
            nombre: nombreCliente,
            telefono: telefonoCliente,
            tipo: tipoCliente,
            comercialAsignadoId: comercialEspecificoId,
            comercialSolicitado: true,
          })
          setMensaje(`Cliente asignado a ${persona.nombre} (${nombreEquipoDe(comercialEspecificoId)}) — no es del equipo de hoy, no aparece en esta fila.`)
        }
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
        await ocuparConCliente(elegido, { id: clienteRef.id, nombre: nombreCliente })
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
    const clienteActual = cola.clienteActual?.[comercialId]

    if (yaOcupado && clienteActual) {
      setResolviendoId(comercialId)
      setMostrandoMotivoId(null)
      return
    }

    await marcarOcupado(equipoActivoId, comercialId, !yaOcupado, ocupadosActuales)
  }

  async function resolverYLiberar(comercialId, esEfectivo) {
    const clienteActual = cola.clienteActual?.[comercialId]
    if (!esEfectivo) {
      await marcarDescarte(clienteActual.id, motivoSeleccionado)
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
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-lg font-semibold text-gray-900">Iniciar semana</h1>
        <p className="text-sm text-gray-600">Selecciona el equipo que atiende esta semana.</p>
        <div className="flex gap-2 flex-wrap">
          {equipos.map((e) => (
            <Boton key={e.id} onClick={() => handleIniciarSemana(e.id)}>
              {e.nombre}
            </Boton>
          ))}
        </div>
        <Alerta tipo="info">{mensaje}</Alerta>
      </div>
    )
  }

  const equipoActivo = equipos.find((e) => e.id === equipoActivoId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Cola — {equipoActivo?.nombre}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (window.confirm('Esto borra quién está ocupado y las llegadas de hoy, y recalcula el orden desde cero. ¿Continuar?')) {
                handleIniciarSemana(equipoActivoId)
              }
            }}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            Reiniciar orden
          </button>
          <button onClick={() => setMostrarCambioEquipo((v) => !v)} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
            Cambiar equipo
          </button>
        </div>
      </div>

      {mostrarCambioEquipo && (
        <Tarjeta animar className="bg-amber-50 border-amber-200 p-4 space-y-2">
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
                  className="rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  {e.nombre}
                </button>
              ))}
          </div>
        </Tarjeta>
      )}

      <Tarjeta className="p-4">
        <form onSubmit={handleAsignar} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Registrar cliente</h2>
          <input
            required
            placeholder="Nombre del cliente"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            className={INPUT}
          />
          <input
            placeholder="Teléfono (opcional)"
            value={telefonoCliente}
            onChange={(e) => setTelefonoCliente(e.target.value)}
            className={INPUT}
          />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={tipoCliente === 'nuevo'} onChange={() => setTipoCliente('nuevo')} />
              Nuevo
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={tipoCliente === 'recurrente'} onChange={() => setTipoCliente('recurrente')} />
              Recurrente
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={pideEspecifico} onChange={(e) => setPideEspecifico(e.target.checked)} />
            Pide un comercial específico
          </label>
          {pideEspecifico && (
            <select
              required
              value={comercialEspecificoId}
              onChange={(e) => setComercialEspecificoId(e.target.value)}
              className={`${INPUT} animate-slide-up`}
            >
              <option value="">Selecciona comercial</option>
              {[...comercialesTodos]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map((c) => {
                  const esDelEquipoActivo = comercialesActivosEquipo.some((ca) => ca.id === c.id)
                  return (
                    <option key={c.id} value={c.id}>
                      {esDelEquipoActivo ? c.nombre : `${c.nombre} (${nombreEquipoDe(c.id) ?? 'sin equipo'})`}
                    </option>
                  )
                })}
            </select>
          )}
          <Boton type="submit" className="w-full">
            Asignar
          </Boton>
          <Alerta tipo="info">{mensaje}</Alerta>
        </form>
      </Tarjeta>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
        <p>
          <strong className="text-gray-700">Siguiente:</strong> el comercial resaltado en azul es quien va a recibir el próximo cliente
          si le das "Asignar" ahora mismo (sin pedir uno específico).
        </p>
        <p>
          <strong className="text-gray-700">Ocupado / Disponible:</strong> se marca solo cuando le asignas un cliente. Para liberarlo vas
          a tener que decir si ese cliente fue efectivo o no. Si necesitas marcarlo ocupado por otro motivo (ausente, etc.) puedes hacerlo
          manual, y ahí sí se libera directo, sin preguntar nada.
        </p>
      </div>

      <h2 className="text-sm font-semibold text-gray-900">Fila del equipo</h2>

      <ol className="space-y-2.5">
        {(cola?.orden ?? []).map((id, i) => {
          const comercial = comercialesPorId[id]
          const ocupado = cola.ocupados?.includes(id)
          const enHorario = comercial ? estaEnHorario(comercial.horarioSemanal) : false
          const llegada = comercial?.ultimaLlegada?.fecha === fechaLocalYYYYMMDD() ? comercial.ultimaLlegada : null
          const esSiguiente = id === proximoEnRecibir
          return (
            <Tarjeta
              key={id}
              animar
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
              className={`px-4 py-3.5 space-y-2.5 ${esSiguiente ? 'border-blue-300 ring-1 ring-blue-200 bg-blue-50/40' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      esSiguiente ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{comercial?.nombre ?? id}</p>
                    {comercial?.telefono && (
                      <a href={enlaceTel(comercial.telefono)} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                        {comercial.telefono}
                      </a>
                    )}
                  </div>
                </div>
                {esSiguiente && <Badge color="blue">Siguiente</Badge>}
              </div>
              {!enHorario && <p className="text-xs text-gray-400 pl-10">Fuera de su horario de hoy</p>}

              <div className="flex items-center justify-between gap-2 pl-10">
                <span className="text-xs text-gray-500">
                  {llegada
                    ? `Llegó hoy a las ${new Date(llegada.horaISO).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Todavía no ha marcado llegada hoy'}
                </span>
                {!llegada && (
                  <Boton variante="secundario" tamano="sm" onClick={() => handleMarcarLlegada(id)} className="shrink-0">
                    Ya llegó
                  </Boton>
                )}
              </div>

              {resolviendoId === id ? (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 ml-10 animate-slide-up">
                  <p className="text-xs text-gray-700">¿{cola.clienteActual?.[id]?.nombre ?? 'El cliente'} fue efectivo?</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => resolverYLiberar(id, true)}
                      className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 hover:bg-emerald-200 transition-colors"
                    >
                      Sí, efectivo
                    </button>
                    <button
                      onClick={() => setMostrandoMotivoId(id)}
                      className="text-xs rounded-full bg-gray-200 text-gray-700 px-3 py-1 hover:bg-gray-300 transition-colors"
                    >
                      No fue efectivo
                    </button>
                  </div>
                  {mostrandoMotivoId === id && (
                    <div className="flex flex-wrap items-center gap-2 animate-slide-up">
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
                  <button onClick={() => setResolviendoId(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pl-10">
                  <span className="text-xs text-gray-500">
                    {ocupado
                      ? cola.clienteActual?.[id]
                        ? `Atendiendo a ${cola.clienteActual[id].nombre}`
                        : 'No disponible'
                      : 'Puede recibir un cliente'}
                  </span>
                  <button
                    onClick={() => toggleOcupado(id)}
                    className={`text-xs rounded-full px-3 py-1 shrink-0 font-medium transition-colors ${
                      ocupado ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {ocupado ? 'Marcar libre' : 'Marcar ocupado'}
                  </button>
                </div>
              )}
            </Tarjeta>
          )
        })}
      </ol>
    </div>
  )
}
