import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { suscribirVehiculos, crearVehiculo } from '../features/vehiculos/vehiculosApi'
import { registrarMovimiento } from '../features/movimientos/movimientosApi'
import { crearReserva, suscribirReservasDeUsuario } from '../features/reservas/reservasApi'
import { suscribirPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { suscribirUsuarios } from '../features/usuarios/usuariosApi'
import { estaBloqueadoPorPicoYPlaca, diasBloqueadosPorPicoYPlacaEnRango } from '../lib/picoYPlaca'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { parseFechaLocal } from '../lib/fechas'
import { useAuth } from '../context/AuthContext'
import CampoArchivo from '../components/CampoArchivo'
import FormularioRegistroPropio from '../components/FormularioRegistroPropio'

const PATRON_PLACA = /^[A-Z]{3}[0-9]{3}$/
const ROLES_GESTION_AMPLIA = ['admin', 'anfitriona']
const DURACIONES_ASIGNACION = [
  { horas: 1, label: '1 hora' },
  { horas: 2, label: '2 horas' },
  { horas: 4, label: '4 horas' },
  { horas: 8, label: 'Todo el día (8 horas)' },
]

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

// Formulario para admin/anfitriona: solo trata con clientes (a comercial o
// directivo se les asigna con FormularioAsignacionInstantanea, que los deja
// auto-registrarse). Para recepción no pide nada de "quién entrega" porque ya
// se sabe por vehiculo.quienTiene.
function FormularioMovimientoAnfitriona({ vehiculo, picoYPlacaConfig, onCerrar }) {
  const { perfil } = useAuth()
  const tipo = vehiculo.estado === 'prestado' ? 'recepcion' : 'entrega'
  const [nombreCliente, setNombreCliente] = useState('')
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

    if (fotos.length === 0) {
      setError('Toma al menos una foto antes de guardar.')
      return
    }
    if (tipo === 'entrega' && !documento) {
      setError('El documento firmado escaneado es obligatorio.')
      return
    }
    if (bloqueadoPorPicoYPlaca) {
      const continuar = window.confirm(
        `${vehiculo.placa} tiene pico y placa hoy. Solo continúa si tienes autorización explícita para usarlo de todas formas. ¿Confirmas que sí?`
      )
      if (!continuar) return
    }

    setEnviando(true)
    try {
      const anfitriona = { tipo: 'anfitriona', nombre: perfil?.nombre ?? '', uid: null }
      const cliente = { tipo: 'cliente', nombre: nombreCliente, uid: null }
      await registrarMovimiento({
        vehiculoId: vehiculo.id,
        tipo,
        quienRecibe: tipo === 'entrega' ? cliente : anfitriona,
        quienEntrega: tipo === 'entrega' ? anfitriona : (vehiculo.quienTiene ?? cliente),
        motivo: motivo.trim() || null,
        fotos,
        video,
        documentoEscaneado: tipo === 'entrega' ? documento : null,
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
        {tipo === 'entrega' ? 'Vas a registrar: Entrega a cliente' : `Vas a registrar: Devolución${vehiculo.quienTiene ? ` de ${vehiculo.quienTiene.nombre}` : ''}`}
      </p>
      {bloqueadoPorPicoYPlaca && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          Este vehículo tiene pico y placa hoy. Al guardar te vamos a pedir confirmación de que tienes autorización.
        </p>
      )}
      {tipo === 'entrega' && (
        <input
          required
          placeholder="Nombre del cliente"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )}
      {tipo === 'entrega' && (
        <input
          placeholder="Motivo (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )}
      <CampoArchivo
        label="Fotos (obligatorio, varios ángulos + kilometraje)"
        icono="camara"
        accept="image/*"
        capture="environment"
        multiple
        archivos={fotos}
        textoVacio="Toca para tomar o elegir fotos"
        onChange={(e) => setFotos(Array.from(e.target.files))}
      />
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

// Crea una reserva que arranca ya — dispara el bloqueo de registro obligatorio
// en la cuenta del comercial/directivo elegido. Anfitriona/admin no suben fotos.
function FormularioAsignacionInstantanea({ vehiculo, personas, onCerrar }) {
  const [personaId, setPersonaId] = useState('')
  const [duracionHoras, setDuracionHoras] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const persona = personas.find((p) => p.id === personaId)
    if (!persona) return

    setEnviando(true)
    try {
      const fechaInicio = new Date()
      const fechaFin = new Date(fechaInicio)
      fechaFin.setHours(fechaFin.getHours() + duracionHoras)
      await crearReserva({
        vehiculoId: vehiculo.id,
        fechaInicio,
        fechaFin,
        solicitadoPor: { tipo: persona.rol, nombre: persona.nombre, uid: persona.id },
        motivo: null,
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
      <p className="text-sm font-medium text-gray-900">Asignar {vehiculo.placa} ahora</p>
      <select
        required
        value={personaId}
        onChange={(e) => setPersonaId(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">Selecciona comercial o directivo</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} ({p.rol === 'comercial' ? 'Comercial' : 'Directivo'})
          </option>
        ))}
      </select>
      <select
        value={duracionHoras}
        onChange={(e) => setDuracionHoras(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        {DURACIONES_ASIGNACION.map((d) => (
          <option key={d.horas} value={d.horas}>
            {d.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-400">
        A esa persona le va a aparecer el registro obligatorio de entrega apenas entre a la app (o ya, si está adentro).
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {enviando ? 'Asignando…' : 'Asignar'}
        </button>
        <button type="button" onClick={onCerrar} className="text-sm text-gray-500">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function VehiculosPage() {
  const { rol, firebaseUser } = useAuth()
  const gestionAmplia = ROLES_GESTION_AMPLIA.includes(rol)
  const [vehiculos, setVehiculos] = useState([])
  const [picoYPlacaConfig, setPicoYPlacaConfig] = useState(null)
  const [personasAsignables, setPersonasAsignables] = useState([])
  const [misReservas, setMisReservas] = useState([])
  const [accionAbierta, setAccionAbierta] = useState(null)
  const [nuevaPlaca, setNuevaPlaca] = useState('')
  const [nuevoModelo, setNuevoModelo] = useState('')
  const [nuevoElectrico, setNuevoElectrico] = useState(false)
  const [errorVehiculo, setErrorVehiculo] = useState('')

  useEffect(() => suscribirVehiculos(setVehiculos), [])
  useEffect(() => suscribirPicoYPlacaConfig(setPicoYPlacaConfig), [])

  useEffect(() => {
    if (!gestionAmplia) return
    return suscribirUsuarios((todos) =>
      setPersonasAsignables(todos.filter((u) => (u.rol === 'comercial' || u.rol === 'directivo') && u.activo !== false))
    )
  }, [gestionAmplia])

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

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Vehículos</h1>

      <ul className="space-y-3">
        {vehiculos.map((v) => {
          const relacion = gestionAmplia ? null : relacionPropia(v)
          return (
            <li key={v.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{v.placa}</p>
                  <p className="text-xs text-gray-500">
                    {v.marcaModelo} {v.esElectricoHibrido && '· eléctrico/híbrido'}
                  </p>
                  {v.estado === 'prestado' && v.quienTiene && (
                    <p className="text-xs text-gray-500">Lo tiene: {v.quienTiene.nombre}</p>
                  )}
                </div>
                <EstadoBadge vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} />
              </div>
              <ConsultaPicoYPlacaRapida vehiculo={v} picoYPlacaConfig={picoYPlacaConfig} />

              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {gestionAmplia && (
                  <>
                    <button
                      onClick={() => setAccionAbierta(accionAbierta === `${v.id}-mov` ? null : `${v.id}-mov`)}
                      className="text-gray-900 underline"
                    >
                      {v.estado === 'prestado' ? 'Registrar devolución' : 'Prestar a cliente'}
                    </button>
                    {v.estado === 'disponible' && (
                      <button
                        onClick={() => setAccionAbierta(accionAbierta === `${v.id}-asig` ? null : `${v.id}-asig`)}
                        className="text-gray-500 underline"
                      >
                        Asignar a comercial/directivo
                      </button>
                    )}
                  </>
                )}
                {!gestionAmplia && relacion.tipo === 'devolucion' && (
                  <button
                    onClick={() => setAccionAbierta(accionAbierta === `${v.id}-mov` ? null : `${v.id}-mov`)}
                    className="text-gray-900 underline"
                  >
                    Registrar devolución
                  </button>
                )}
                {!gestionAmplia && relacion.tipo === 'anticipada' && (
                  <button
                    onClick={() => setAccionAbierta(accionAbierta === `${v.id}-mov` ? null : `${v.id}-mov`)}
                    className="text-gray-900 underline"
                  >
                    Registrar entrega anticipada
                  </button>
                )}
                <Link to="/reservas" className="text-gray-500 underline">
                  Ver / crear reservas
                </Link>
              </div>

              {gestionAmplia && accionAbierta === `${v.id}-mov` && (
                <FormularioMovimientoAnfitriona
                  vehiculo={v}
                  picoYPlacaConfig={picoYPlacaConfig}
                  onCerrar={() => setAccionAbierta(null)}
                />
              )}
              {gestionAmplia && accionAbierta === `${v.id}-asig` && (
                <FormularioAsignacionInstantanea vehiculo={v} personas={personasAsignables} onCerrar={() => setAccionAbierta(null)} />
              )}
              {!gestionAmplia && accionAbierta === `${v.id}-mov` && relacion.tipo !== 'ninguna' && (
                <div className="mt-2 bg-gray-50 rounded-lg p-3">
                  <FormularioRegistroPropio
                    vehiculo={v}
                    tipo={relacion.tipo === 'devolucion' ? 'recepcion' : 'entrega'}
                    reserva={relacion.reserva}
                    onListo={() => setAccionAbierta(null)}
                    onCancelar={() => setAccionAbierta(null)}
                  />
                </div>
              )}
            </li>
          )
        })}
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
