import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { suscribirVehiculos, crearVehiculo } from '../features/vehiculos/vehiculosApi'
import { registrarMovimiento } from '../features/movimientos/movimientosApi'
import {
  crearReserva,
  suscribirReservasDeUsuario,
  suscribirReservas,
  verificarDisponibilidad,
  proximasReservasDelVehiculo,
} from '../features/reservas/reservasApi'
import { suscribirPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { suscribirUsuarios } from '../features/usuarios/usuariosApi'
import { suscribirEtiquetas } from '../features/etiquetas/etiquetasApi'
import { estaBloqueadoPorPicoYPlaca, diasBloqueadosPorPicoYPlacaEnRango, diasSemanaPicoYPlaca } from '../lib/picoYPlaca'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { parseFechaLocal, formatoFechaLarga, formatoHoraCorta } from '../lib/fechas'
import { fotosFaltantes } from '../lib/fotosVehiculo'
import { coincideBusqueda, unirConY } from '../lib/texto'
import { agruparPersonasPorEtiqueta } from '../lib/agruparPorEtiqueta'
import { ETIQUETA_DIA } from '../lib/horario'
import { INPUT } from '../lib/estilos'
import { useAuth } from '../context/AuthContext'
import CampoArchivo from '../components/CampoArchivo'
import FotosVehiculo from '../components/FotosVehiculo'
import FormularioRegistroPropio from '../components/FormularioRegistroPropio'
import BarraBusqueda from '../components/BarraBusqueda'
import Tarjeta from '../components/Tarjeta'
import Boton from '../components/Boton'
import Badge from '../components/Badge'
import Alerta from '../components/Alerta'
import Vacio from '../components/Vacio'

const PATRON_PLACA = /^[A-Z]{3}[0-9]{3}$/
const ROLES_GESTION_AMPLIA = ['admin', 'anfitriona']
const DURACIONES_ASIGNACION = [
  { horas: 1, label: '1 hora' },
  { horas: 2, label: '2 horas' },
  { horas: 4, label: '4 horas' },
  { horas: 8, label: 'Todo el día (8 horas)' },
]

// Bloqueo duro si la ventana pedida se cruza con una reserva existente;
// aviso (no bloqueante) si hay una reserva próxima poco después — para que
// quien presta el vehículo pueda avisar "debe estar de vuelta antes de tal
// hora" en vez de enterarse tarde (ver feedback: "dejando poco tiempo a la
// reacción"). Nunca pasa por mensajeErrorAmigable porque ese ignora
// err.message y solo mira err.code.
async function validarChoquesReserva(vehiculoId, fechaInicio, fechaFin, placa) {
  const { disponible, conflictos } = await verificarDisponibilidad(vehiculoId, fechaInicio, fechaFin)
  if (!disponible) {
    const primero = conflictos[0]
    return {
      ok: false,
      mensaje: `${placa} ya tiene una reserva de ${primero.solicitadoPor?.nombre ?? 'alguien más'} que se cruza con este horario. Elige otro vehículo o achica la duración.`,
    }
  }

  const proximas = await proximasReservasDelVehiculo(vehiculoId, fechaFin)
  if (proximas.length === 0) return { ok: true, mensaje: null }

  const siguiente = proximas[0]
  const continuar = window.confirm(
    `${placa} tiene una reserva de ${siguiente.solicitadoPor?.nombre ?? 'alguien más'} el ${formatoFechaLarga(siguiente.fechaInicio.toDate())} a las ${formatoHoraCorta(siguiente.fechaInicio.toDate())}. Debe estar disponible antes de esa hora. ¿Continuar de todas formas?`
  )
  return { ok: continuar, mensaje: null }
}

function EstadoBadge({ vehiculo, picoYPlacaConfig, asignadoAhora }) {
  const bloqueado = estaBloqueadoPorPicoYPlaca(vehiculo, picoYPlacaConfig)
  if (vehiculo.estado === 'prestado') return <Badge color="amber" dot>En uso</Badge>
  if (asignadoAhora) return <Badge color="blue" dot>Asignado</Badge>
  if (bloqueado) return <Badge color="red" dot>Pico y placa hoy</Badge>
  return <Badge color="emerald" dot>Disponible</Badge>
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
    <div className="mt-2.5 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-gray-400">¿Pico y placa?</span>
        <Boton variante="suave" tamano="sm" onClick={() => chequearUnDia(hoy)} className="!rounded-full">
          Hoy
        </Boton>
        <Boton variante="suave" tamano="sm" onClick={() => chequearUnDia(manana)} className="!rounded-full">
          Mañana
        </Boton>
        <Boton variante="suave" tamano="sm" onClick={() => setMostrarRango((v) => !v)} className="!rounded-full">
          Varios días
        </Boton>
      </div>

      {mostrarRango && (
        <div className="flex flex-wrap items-center gap-2 animate-slide-up">
          <input
            type="date"
            onChange={(e) => e.target.value && setDesde(parseFechaLocal(e.target.value))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
          <span className="text-gray-400">hasta</span>
          <input
            type="date"
            onChange={(e) => e.target.value && setHasta(parseFechaLocal(e.target.value))}
            className="rounded-lg border border-gray-300 px-2 py-1 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
        </div>
      )}

      {diasBloqueados !== null && (
        <p className={`font-medium animate-fade-in ${diasBloqueados.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
          {vehiculo.esElectricoHibrido
            ? 'Exento (eléctrico/híbrido)'
            : diasBloqueados.length > 0
              ? `Pico y placa: ${diasBloqueados.map((d) => formatoFechaLarga(d)).join(', ')}`
              : esUnSoloDia
                ? `Libre el ${formatoFechaLarga(desde)}`
                : `Libre todo el rango (${formatoFechaLarga(desde)} – ${formatoFechaLarga(hasta)})`}
        </p>
      )}
    </div>
  )
}

// Formulario para admin/anfitriona: solo trata con clientes (a comercial o
// directivo se les asigna con FormularioAsignacionInstantanea, que los deja
// auto-registrarse). Para recepción no pide nada de "quién entrega" porque ya
// se sabe por vehiculo.quienTiene.
//
// La entrega a cliente crea primero una reserva (inicio=ahora) con
// responsable + autorizadoPor, y solo después registra el movimiento atado a
// ella — así todo préstamo (instantáneo o no) queda bajo el mismo mecanismo
// de responsabilidad/incumplimiento que ya usan comercial y directivo.
function FormularioMovimientoAnfitriona({ vehiculo, picoYPlacaConfig, directivosActivos, staffResponsable, etiquetas, onCerrar }) {
  const { perfil } = useAuth()
  const gruposStaffResponsable = agruparPersonasPorEtiqueta(staffResponsable, etiquetas)
  const tipo = vehiculo.estado === 'prestado' ? 'recepcion' : 'entrega'
  const [nombreCliente, setNombreCliente] = useState('')
  const [motivo, setMotivo] = useState('')
  const [duracionHoras, setDuracionHoras] = useState(4)
  const [responsableId, setResponsableId] = useState('')
  const [autorizadoPorId, setAutorizadoPorId] = useState('')
  const [fotos, setFotos] = useState({})
  const [video, setVideo] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function handleFotoChange(lado, archivo) {
    setFotos((prev) => ({ ...prev, [lado]: archivo }))
  }

  const bloqueadoPorPicoYPlaca = tipo === 'entrega' && estaBloqueadoPorPicoYPlaca(vehiculo, picoYPlacaConfig)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (tipo === 'entrega') {
      const faltantes = fotosFaltantes(fotos)
      if (faltantes.length > 0) {
        setError(`Faltan fotos: ${faltantes.map((f) => f.label).join(', ')}.`)
        return
      }
      if (!documento) {
        setError('El documento firmado escaneado es obligatorio.')
        return
      }
      if (!responsableId) {
        setError('Falta indicar quién queda como responsable de este préstamo.')
        return
      }
      if (!autorizadoPorId) {
        setError('Falta indicar qué directivo autorizó este préstamo.')
        return
      }
      if (bloqueadoPorPicoYPlaca) {
        const continuar = window.confirm(
          `${vehiculo.placa} tiene pico y placa hoy. Solo continúa si tienes autorización explícita para usarlo de todas formas. ¿Confirmas que sí?`
        )
        if (!continuar) return
      }
    }

    setEnviando(true)
    try {
      const anfitriona = { tipo: 'anfitriona', nombre: perfil?.nombre ?? '', uid: null }
      const cliente = { tipo: 'cliente', nombre: nombreCliente, uid: null }

      if (tipo === 'recepcion') {
        await registrarMovimiento({
          vehiculoId: vehiculo.id,
          tipo,
          quienRecibe: anfitriona,
          quienEntrega: vehiculo.quienTiene ?? cliente,
          motivo: motivo.trim() || null,
          fotos,
          video,
          documentoEscaneado: null,
        })
        onCerrar()
        return
      }

      const fechaInicio = new Date()
      const fechaFin = new Date(fechaInicio)
      fechaFin.setHours(fechaFin.getHours() + duracionHoras)

      const resultadoChoque = await validarChoquesReserva(vehiculo.id, fechaInicio, fechaFin, vehiculo.placa)
      if (!resultadoChoque.ok) {
        if (resultadoChoque.mensaje) setError(resultadoChoque.mensaje)
        setEnviando(false)
        return
      }

      const responsablePersona = staffResponsable.find((p) => p.id === responsableId)
      const directivo = directivosActivos.find((d) => d.id === autorizadoPorId)
      const responsable = { tipo: responsablePersona.rol, nombre: responsablePersona.nombre, uid: responsablePersona.id }
      const autorizadoPor = { uid: directivo.id, nombre: directivo.nombre }

      const reservaRef = await crearReserva({
        vehiculoId: vehiculo.id,
        fechaInicio,
        fechaFin,
        solicitadoPor: { tipo: 'cliente', nombre: nombreCliente, uid: null },
        motivo: motivo.trim() || null,
        autorizadoPor,
        responsable,
      })

      await registrarMovimiento({
        vehiculoId: vehiculo.id,
        tipo,
        quienRecibe: cliente,
        quienEntrega: anfitriona,
        motivo: motivo.trim() || null,
        fotos,
        video,
        documentoEscaneado: documento,
        reservaId: reservaRef.id,
        responsable,
      })
      onCerrar()
    } catch (err) {
      setError(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 bg-gray-50 rounded-xl p-4 animate-slide-up">
      <p className="text-sm font-medium text-gray-900">
        {tipo === 'entrega' ? 'Vas a registrar: Entrega a cliente' : `Vas a registrar: Devolución${vehiculo.quienTiene ? ` de ${vehiculo.quienTiene.nombre}` : ''}`}
      </p>
      <Alerta tipo="advertencia">
        {bloqueadoPorPicoYPlaca && 'Este vehículo tiene pico y placa hoy. Al guardar te vamos a pedir confirmación de que tienes autorización.'}
      </Alerta>
      {tipo === 'entrega' && (
        <input required placeholder="Nombre del cliente" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} className={INPUT} />
      )}
      {tipo === 'entrega' && (
        <input placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT} />
      )}
      {tipo === 'entrega' && (
        <select value={duracionHoras} onChange={(e) => setDuracionHoras(Number(e.target.value))} className={INPUT}>
          {DURACIONES_ASIGNACION.map((d) => (
            <option key={d.horas} value={d.horas}>
              {d.label}
            </option>
          ))}
        </select>
      )}
      {tipo === 'entrega' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Responsable del préstamo</label>
          <select required value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className={INPUT}>
            <option value="">Selecciona quién queda como responsable</option>
            {gruposStaffResponsable.map((grupo) => (
              <optgroup key={grupo.titulo} label={grupo.titulo}>
                {grupo.personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.rol})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      {tipo === 'entrega' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Autorizado por</label>
          <select required value={autorizadoPorId} onChange={(e) => setAutorizadoPorId(e.target.value)} className={INPUT}>
            <option value="">Selecciona el directivo que autorizó</option>
            {directivosActivos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      <FotosVehiculo fotos={fotos} onChange={handleFotoChange} />
      <CampoArchivo
        label="Video (opcional)"
        icono="video"
        accept="video/*"
        capture="environment"
        archivos={video ? [video] : []}
        textoVacio="Toca para grabar o elegir un video"
        onChange={(e) => setVideo(e.target.files[0] ?? null)}
      />
      {tipo === 'entrega' && (
        <CampoArchivo
          label="Documento firmado escaneado (obligatorio)"
          icono="documento"
          accept="image/*,application/pdf"
          archivos={documento ? [documento] : []}
          textoVacio="Toca para adjuntar el documento"
          onChange={(e) => setDocumento(e.target.files[0] ?? null)}
        />
      )}
      <Alerta tipo="error">{error}</Alerta>
      <div className="flex gap-2">
        <Boton type="submit" cargando={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <Boton type="button" variante="fantasma" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

// Crea una reserva que arranca ya — dispara el bloqueo de registro obligatorio
// en la cuenta del comercial/directivo elegido. Anfitriona/admin no suben fotos.
// Si a quien se le asigna ya es directivo, no hace falta autorización de otro
// directivo (se asume autosuficiente).
function FormularioAsignacionInstantanea({ vehiculo, personas, directivosActivos, etiquetas, onCerrar }) {
  const [personaId, setPersonaId] = useState('')
  const [duracionHoras, setDuracionHoras] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [autorizadoPorId, setAutorizadoPorId] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const persona = personas.find((p) => p.id === personaId)
  const necesitaAutorizacion = persona && persona.rol !== 'directivo'
  const gruposPersonas = agruparPersonasPorEtiqueta(personas, etiquetas)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!persona) return
    if (necesitaAutorizacion && !autorizadoPorId) {
      setError('Falta indicar qué directivo autorizó esta asignación.')
      return
    }

    setEnviando(true)
    try {
      const fechaInicio = new Date()
      const fechaFin = new Date(fechaInicio)
      fechaFin.setHours(fechaFin.getHours() + duracionHoras)

      const resultadoChoque = await validarChoquesReserva(vehiculo.id, fechaInicio, fechaFin, vehiculo.placa)
      if (!resultadoChoque.ok) {
        if (resultadoChoque.mensaje) setError(resultadoChoque.mensaje)
        setEnviando(false)
        return
      }

      const directivo = necesitaAutorizacion ? directivosActivos.find((d) => d.id === autorizadoPorId) : null
      await crearReserva({
        vehiculoId: vehiculo.id,
        fechaInicio,
        fechaFin,
        solicitadoPor: { tipo: persona.rol, nombre: persona.nombre, uid: persona.id },
        motivo: motivo.trim() || null,
        autorizadoPor: directivo ? { uid: directivo.id, nombre: directivo.nombre } : null,
      })
      onCerrar()
    } catch (err) {
      setError(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 bg-gray-50 rounded-xl p-4 animate-slide-up">
      <p className="text-sm font-medium text-gray-900">Asignar {vehiculo.placa} ahora</p>
      <select required value={personaId} onChange={(e) => setPersonaId(e.target.value)} className={INPUT}>
        <option value="">Selecciona comercial o directivo</option>
        {gruposPersonas.map((grupo) => (
          <optgroup key={grupo.titulo} label={grupo.titulo}>
            {grupo.personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.rol === 'comercial' ? 'Comercial' : 'Directivo'})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select value={duracionHoras} onChange={(e) => setDuracionHoras(Number(e.target.value))} className={INPUT}>
        {DURACIONES_ASIGNACION.map((d) => (
          <option key={d.horas} value={d.horas}>
            {d.label}
          </option>
        ))}
      </select>
      <input placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT} />
      {necesitaAutorizacion && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Autorizado por</label>
          <select required value={autorizadoPorId} onChange={(e) => setAutorizadoPorId(e.target.value)} className={INPUT}>
            <option value="">Selecciona el directivo que autorizó</option>
            {directivosActivos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="text-xs text-gray-400">
        A esa persona le va a aparecer el registro obligatorio de entrega apenas entre a la app (o ya, si está adentro).
      </p>
      <Alerta tipo="error">{error}</Alerta>
      <div className="flex gap-2">
        <Boton type="submit" cargando={enviando}>
          {enviando ? 'Asignando…' : 'Asignar'}
        </Boton>
        <Boton type="button" variante="fantasma" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

export default function VehiculosPage() {
  const { rol, firebaseUser } = useAuth()
  const gestionAmplia = ROLES_GESTION_AMPLIA.includes(rol)
  const [vehiculos, setVehiculos] = useState([])
  const [picoYPlacaConfig, setPicoYPlacaConfig] = useState(null)
  const [usuariosTodos, setUsuariosTodos] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [misReservas, setMisReservas] = useState([])
  const [todasReservas, setTodasReservas] = useState([])
  const [accionAbierta, setAccionAbierta] = useState(null)
  const [nuevaPlaca, setNuevaPlaca] = useState('')
  const [nuevoModelo, setNuevoModelo] = useState('')
  const [nuevoElectrico, setNuevoElectrico] = useState(false)
  const [errorVehiculo, setErrorVehiculo] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => suscribirPicoYPlacaConfig(setPicoYPlacaConfig), [])
  useEffect(() => suscribirReservas(setTodasReservas), [])

  useEffect(() => {
    if (!gestionAmplia) return
    return suscribirUsuarios(setUsuariosTodos)
  }, [gestionAmplia])

  useEffect(() => {
    if (!gestionAmplia) return
    return suscribirEtiquetas(setEtiquetas)
  }, [gestionAmplia])

  const personasAsignables = usuariosTodos.filter((u) => (u.rol === 'comercial' || u.rol === 'directivo') && u.activo !== false)
  const directivosActivos = usuariosTodos.filter((u) => u.rol === 'directivo' && u.activo !== false)
  const staffResponsable = usuariosTodos.filter(
    (u) => ['comercial', 'directivo', 'anfitriona'].includes(u.rol) && u.activo !== false
  )

  useEffect(() => {
    if (gestionAmplia || !firebaseUser) return
    return suscribirReservasDeUsuario(firebaseUser.uid, setMisReservas)
  }, [gestionAmplia, firebaseUser])

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

  // Para comercial/directivo: ¿qué puede hacer con este vehículo específico?
  function relacionPropia(vehiculo) {
    if (vehiculo.quienTiene?.uid === firebaseUser?.uid) return { tipo: 'devolucion' }
    const reserva = misReservas.find((r) => r.vehiculoId === vehiculo.id && r.resultado === 'pendiente')
    if (reserva && new Date() < reserva.fechaInicio.toDate() && vehiculo.estado === 'disponible') {
      return { tipo: 'anticipada', reserva }
    }
    return { tipo: 'ninguna' }
  }

  // Hay alguien con una reserva ya en curso sobre este vehículo que todavía
  // no formalizó la entrega — estado intermedio entre disponible y en uso.
  function reservaAsignadaAhora(vehiculoId) {
    const ahora = new Date()
    return todasReservas.find(
      (r) =>
        r.vehiculoId === vehiculoId &&
        r.estado === 'activa' &&
        r.resultado === 'pendiente' &&
        ahora >= r.fechaInicio.toDate() &&
        ahora <= r.fechaFin.toDate()
    )
  }

  const vehiculosVisibles = vehiculos.filter((v) => coincideBusqueda(`${v.placa} ${v.marcaModelo ?? ''}`, busqueda))

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Vehículos</h1>
        {vehiculos.length > 0 && <span className="text-xs text-gray-400">{vehiculos.length} en total</span>}
      </div>

      {rol === 'admin' && (
        <Tarjeta className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Agregar vehículo</h2>
          <form onSubmit={handleCrearVehiculo} className="space-y-3">
            <div>
              <input
                required
                placeholder="Ej: ABC123"
                value={nuevaPlaca}
                onChange={(e) => handlePlacaChange(e.target.value)}
                maxLength={6}
                className={`${INPUT} uppercase`}
              />
              <p className="text-xs text-gray-400 mt-1">Formato: 3 letras + 3 números, sin espacios ni guion (ej: ABC123).</p>
            </div>
            <input placeholder="Marca / modelo" value={nuevoModelo} onChange={(e) => setNuevoModelo(e.target.value)} className={INPUT} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={nuevoElectrico} onChange={(e) => setNuevoElectrico(e.target.checked)} />
              Es eléctrico o híbrido (exento de pico y placa)
            </label>
            <Alerta tipo="error">{errorVehiculo}</Alerta>
            <Boton type="submit">Agregar</Boton>
          </form>
        </Tarjeta>
      )}

      {vehiculos.length === 0 && <Vacio titulo="Todavía no hay vehículos" descripcion="Un admin puede agregar el primero arriba." />}

      {vehiculos.length > 0 && (
        <BarraBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar por placa o modelo..." />
      )}

      {vehiculos.length > 0 && vehiculosVisibles.length === 0 && (
        <Vacio titulo="Sin resultados" descripcion={`Nada coincide con "${busqueda}".`} />
      )}

      <ul className="space-y-3">
        {vehiculosVisibles.map((v, i) => {
          const relacion = gestionAmplia ? null : relacionPropia(v)
          const reservaAsignada = v.estado === 'disponible' ? reservaAsignadaAhora(v.id) : null
          const diasPicoYPlaca = diasSemanaPicoYPlaca(v, picoYPlacaConfig)
          return (
            <Tarjeta key={v.id} interactiva animar className="p-4" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 tracking-wide">{v.placa}</p>
                  <p className="text-xs text-gray-500">
                    {v.marcaModelo} {v.esElectricoHibrido && '· eléctrico/híbrido'}
                  </p>
                  {v.estado === 'prestado' && v.quienTiene && (
                    <p className="text-xs text-gray-500">Lo tiene: {v.quienTiene.nombre}</p>
                  )}
                  {reservaAsignada && (
                    <p className="text-xs text-gray-500">Asignado a: {reservaAsignada.solicitadoPor?.nombre}</p>
                  )}
                  {diasPicoYPlaca.length > 0 && (
                    <p className="text-xs text-gray-400">
                      Pico y placa: {unirConY(diasPicoYPlaca.map((d) => ETIQUETA_DIA[d]))}
                    </p>
                  )}
                </div>
                <EstadoBadge vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} asignadoAhora={Boolean(reservaAsignada)} />
              </div>
              <ConsultaPicoYPlacaRapida vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} />

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {gestionAmplia && (
                  <>
                    <button
                      onClick={() => setAccionAbierta(accionAbierta === `${v.id}-mov` ? null : `${v.id}-mov`)}
                      className="text-gray-900 font-medium hover:underline underline-offset-2 transition-colors"
                    >
                      {v.estado === 'prestado' ? 'Registrar devolución' : 'Prestar a cliente'}
                    </button>
                    {v.estado === 'disponible' && (
                      <button
                        onClick={() => setAccionAbierta(accionAbierta === `${v.id}-asig` ? null : `${v.id}-asig`)}
                        className="text-gray-500 hover:text-gray-900 hover:underline underline-offset-2 transition-colors"
                      >
                        Asignar a comercial/directivo
                      </button>
                    )}
                  </>
                )}
                {!gestionAmplia && relacion.tipo === 'devolucion' && (
                  <button
                    onClick={() => setAccionAbierta(accionAbierta === `${v.id}-mov` ? null : `${v.id}-mov`)}
                    className="text-gray-900 font-medium hover:underline underline-offset-2 transition-colors"
                  >
                    Registrar devolución
                  </button>
                )}
                {!gestionAmplia && relacion.tipo === 'anticipada' && (
                  <button
                    onClick={() => setAccionAbierta(accionAbierta === `${v.id}-mov` ? null : `${v.id}-mov`)}
                    className="text-gray-900 font-medium hover:underline underline-offset-2 transition-colors"
                  >
                    Registrar entrega anticipada
                  </button>
                )}
                <Link to="/reservas" className="text-gray-500 hover:text-gray-900 hover:underline underline-offset-2 transition-colors">
                  Ver / crear reservas
                </Link>
              </div>

              {gestionAmplia && accionAbierta === `${v.id}-mov` && (
                <FormularioMovimientoAnfitriona
                  vehiculo={v}
                  picoYPlacaConfig={picoYPlacaConfig}
                  directivosActivos={directivosActivos}
                  staffResponsable={staffResponsable}
                  etiquetas={etiquetas}
                  onCerrar={() => setAccionAbierta(null)}
                />
              )}
              {gestionAmplia && accionAbierta === `${v.id}-asig` && (
                <FormularioAsignacionInstantanea
                  vehiculo={v}
                  personas={personasAsignables}
                  directivosActivos={directivosActivos}
                  etiquetas={etiquetas}
                  onCerrar={() => setAccionAbierta(null)}
                />
              )}
              {!gestionAmplia && accionAbierta === `${v.id}-mov` && relacion.tipo !== 'ninguna' && (
                <div className="mt-3 bg-gray-50 rounded-xl p-4 animate-slide-up">
                  <FormularioRegistroPropio
                    vehiculo={v}
                    tipo={relacion.tipo === 'devolucion' ? 'recepcion' : 'entrega'}
                    reserva={relacion.reserva}
                    onListo={() => setAccionAbierta(null)}
                    onCancelar={() => setAccionAbierta(null)}
                  />
                </div>
              )}
            </Tarjeta>
          )
        })}
      </ul>
    </div>
  )
}
