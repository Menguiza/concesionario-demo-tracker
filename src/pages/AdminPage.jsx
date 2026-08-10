import { useEffect, useState } from 'react'
import { suscribirEquipos, crearEquipo, actualizarMiembrosEquipo } from '../features/equipos/equiposApi'
import { suscribirUsuarios, crearUsuarioStaff, actualizarUsuario } from '../features/usuarios/usuariosApi'
import { suscribirPicoYPlacaConfig, guardarPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { DIAS_SEMANA } from '../lib/horario'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { INPUT, INPUT_SM } from '../lib/estilos'
import Tarjeta from '../components/Tarjeta'
import Boton from '../components/Boton'
import Alerta from '../components/Alerta'

function horarioVacio() {
  return Object.fromEntries(DIAS_SEMANA.map((d) => [d, { activo: false, inicio: '08:00', fin: '18:00' }]))
}

function tieneAlgunDiaActivo(horario) {
  return Object.values(horario ?? {}).some((bloque) => bloque?.activo)
}

function EditorHorario({ horario, onChange }) {
  return (
    <div className="space-y-1">
      {DIAS_SEMANA.map((dia) => (
        <div
          key={dia}
          className={`flex items-center gap-2 text-xs rounded-lg px-1.5 py-1 transition-colors ${
            horario[dia].activo ? 'bg-gray-50' : ''
          }`}
        >
          <label className="flex items-center gap-1.5 w-24 capitalize cursor-pointer">
            <input
              type="checkbox"
              checked={horario[dia].activo}
              onChange={(e) => onChange({ ...horario, [dia]: { ...horario[dia], activo: e.target.checked } })}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
            />
            {dia}
          </label>
          <input
            type="time"
            value={horario[dia].inicio}
            disabled={!horario[dia].activo}
            onChange={(e) => onChange({ ...horario, [dia]: { ...horario[dia], inicio: e.target.value } })}
            className={`${INPUT_SM} disabled:opacity-40`}
          />
          <input
            type="time"
            value={horario[dia].fin}
            disabled={!horario[dia].activo}
            onChange={(e) => onChange({ ...horario, [dia]: { ...horario[dia], fin: e.target.value } })}
            className={`${INPUT_SM} disabled:opacity-40`}
          />
        </div>
      ))}
      {!tieneAlgunDiaActivo(horario) && (
        <Alerta tipo="advertencia">Sin ningún día activo, este comercial no va a poder recibir clientes en la cola.</Alerta>
      )}
    </div>
  )
}

function SeccionEquipos({ equipos, usuarios }) {
  const [nombre, setNombre] = useState('')

  async function handleCrear(e) {
    e.preventDefault()
    await crearEquipo(nombre)
    setNombre('')
  }

  async function toggleMiembro(equipo, comercialId) {
    const miembros = equipo.miembros.includes(comercialId)
      ? equipo.miembros.filter((id) => id !== comercialId)
      : [...equipo.miembros, comercialId]
    await actualizarMiembrosEquipo(equipo.id, miembros)
  }

  function otrosEquiposDe(comercialId, equipoActualId) {
    return equipos.filter((e) => e.id !== equipoActualId && e.miembros.includes(comercialId)).map((e) => e.nombre)
  }

  const comerciales = usuarios.filter((u) => u.rol === 'comercial')

  return (
    <Tarjeta animar className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Equipos</h2>
      <p className="text-xs text-gray-500">Un comercial puede estar en varios equipos — se marca aquí, este es el único lugar donde se edita.</p>
      <form onSubmit={handleCrear} className="flex gap-2">
        <input required placeholder="Nombre del equipo" value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} />
        <Boton type="submit" className="shrink-0">
          Crear
        </Boton>
      </form>
      {equipos.map((equipo) => (
        <div key={equipo.id} className="border-t border-gray-100 pt-2">
          <p className="text-sm font-medium text-gray-900">{equipo.nombre}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {comerciales.map((c) => {
              const otros = otrosEquiposDe(c.id, equipo.id)
              const enEquipo = equipo.miembros.includes(c.id)
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 cursor-pointer border transition-colors ${
                    enEquipo ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-transparent hover:border-gray-300'
                  }`}
                >
                  <input type="checkbox" checked={enEquipo} onChange={() => toggleMiembro(equipo, c.id)} className="hidden" />
                  {c.nombre}
                  {otros.length > 0 && <span className={enEquipo ? 'text-white/70' : 'text-amber-700'}>· también en: {otros.join(', ')}</span>}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </Tarjeta>
  )
}

function SeccionUsuarios({ equipos }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('comercial')
  const [equipoId, setEquipoId] = useState('')
  const [horario, setHorario] = useState(horarioVacio())
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleCrear(e) {
    e.preventDefault()
    setEnviando(true)
    setMensaje('')
    try {
      const { correoEnviado } = await crearUsuarioStaff({
        email,
        password,
        nombre,
        telefono,
        rol,
        equipoId: rol === 'comercial' ? equipoId || null : null,
        horarioSemanal: rol === 'comercial' ? horario : null,
      })
      setMensaje(
        correoEnviado
          ? `Cuenta creada para ${nombre}. Le va a llegar un correo para poner su contraseña — si no le llega, pásale la contraseña temporal directo y que la cambie desde "Cambiar contraseña" ya adentro de la app.`
          : `Cuenta creada para ${nombre}. El correo automático no salió (hay un problema del lado de Firebase ahora mismo, no es nada tuyo) — pásale la contraseña temporal por teléfono/WhatsApp y que la cambie ella misma desde "Cambiar contraseña" cuando entre.`
      )
      setNombre('')
      setTelefono('')
      setEmail('')
      setPassword('')
      setEquipoId('')
      setHorario(horarioVacio())
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Tarjeta animar className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Crear cuenta de staff</h2>
      <form onSubmit={handleCrear} className="space-y-2" autoComplete="off">
        <input required placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={INPUT} />
        {rol !== 'admin' && (
          <input
            required
            type="tel"
            placeholder="Número de contacto"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={`${INPUT} animate-slide-up`}
          />
        )}
        <input
          required
          type="email"
          placeholder="Correo del nuevo usuario"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          name="nuevo-staff-correo"
          className={INPUT}
        />
        <div>
          <input
            required
            type="password"
            minLength={6}
            placeholder="Contraseña temporal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            name="nuevo-staff-password"
            className={INPUT}
          />
          <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres. La persona la puede cambiar después.</p>
        </div>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className={INPUT}>
          <option value="comercial">Comercial</option>
          <option value="anfitriona">Anfitriona</option>
          <option value="directivo">Directivo</option>
          <option value="admin">Admin</option>
        </select>
        {rol === 'comercial' && (
          <div className="space-y-2 animate-slide-up">
            <div>
              <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)} className={INPUT}>
                <option value="">Sin equipo (asignar después)</option>
                {equipos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Si necesita estar en más de un equipo, agrega los demás luego desde "Equipos".</p>
            </div>
            <EditorHorario horario={horario} onChange={setHorario} />
          </div>
        )}
        <Boton type="submit" cargando={enviando}>
          {enviando ? 'Creando…' : 'Crear cuenta'}
        </Boton>
        <Alerta tipo="info">{mensaje}</Alerta>
      </form>
    </Tarjeta>
  )
}

function FilaUsuarioExistente({ usuario, equipos }) {
  const [expandido, setExpandido] = useState(false)
  const [horario, setHorario] = useState(usuario.horarioSemanal ?? horarioVacio())
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardandoTelefono, setGuardandoTelefono] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajeTelefono, setMensajeTelefono] = useState('')

  const equiposDelComercial = equipos.filter((e) => e.miembros.includes(usuario.id)).map((e) => e.nombre)
  const esComercial = usuario.rol === 'comercial'
  const puedeExpandir = usuario.rol !== 'admin'

  async function toggleActivo() {
    await actualizarUsuario(usuario.id, { activo: !(usuario.activo !== false) })
  }

  async function handleGuardarHorario() {
    setGuardando(true)
    setMensaje('')
    try {
      await actualizarUsuario(usuario.id, { horarioSemanal: horario })
      setMensaje('Guardado.')
    } catch (err) {
      setMensaje(mensajeErrorAmigable(err))
    } finally {
      setGuardando(false)
    }
  }

  async function handleGuardarTelefono() {
    setGuardandoTelefono(true)
    setMensajeTelefono('')
    try {
      await actualizarUsuario(usuario.id, { telefono })
      setMensajeTelefono('Guardado.')
    } catch (err) {
      setMensajeTelefono(mensajeErrorAmigable(err))
    } finally {
      setGuardandoTelefono(false)
    }
  }

  return (
    <div className="border-t border-gray-100 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => puedeExpandir && setExpandido((v) => !v)}
          className={`flex-1 text-left ${puedeExpandir ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
            {puedeExpandir && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${expandido ? 'rotate-90' : ''}`}
              >
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {usuario.nombre}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {usuario.rol}
            {equiposDelComercial.length > 0 && ` · ${equiposDelComercial.join(', ')}`}
            {esComercial && equiposDelComercial.length === 0 && ' · sin equipo'}
          </p>
        </button>
        <label className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={usuario.activo !== false}
            onChange={toggleActivo}
            className="rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
          />
          Activo
        </label>
      </div>

      {puedeExpandir && expandido && (
        <div className="mt-2 pl-4 space-y-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <input
              type="tel"
              placeholder="Número de contacto"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`flex-1 ${INPUT_SM}`}
            />
            <Boton tamano="sm" cargando={guardandoTelefono} onClick={handleGuardarTelefono} className="shrink-0">
              {guardandoTelefono ? 'Guardando…' : 'Guardar'}
            </Boton>
            {mensajeTelefono && <span className="text-xs text-gray-500 shrink-0">{mensajeTelefono}</span>}
          </div>

          {esComercial && (
            <>
              <EditorHorario horario={horario} onChange={setHorario} />
              <div className="flex items-center gap-2">
                <Boton tamano="sm" cargando={guardando} onClick={handleGuardarHorario}>
                  {guardando ? 'Guardando…' : 'Guardar horario'}
                </Boton>
                {mensaje && <p className="text-xs text-gray-500">{mensaje}</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SeccionUsuariosExistentes({ usuarios, equipos }) {
  if (usuarios.length === 0) return null
  return (
    <Tarjeta animar className="p-4 space-y-1">
      <h2 className="text-sm font-semibold text-gray-900">Staff existente</h2>
      <p className="text-xs text-gray-500 mb-2">
        Toca un comercial para editar su horario. El equipo se cambia desde la sección "Equipos".
      </p>
      {usuarios.map((u) => (
        <FilaUsuarioExistente key={u.id} usuario={u} equipos={equipos} />
      ))}
    </Tarjeta>
  )
}

function SeccionPicoYPlaca() {
  const [textoPorDia, setTextoPorDia] = useState(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(
    () =>
      suscribirPicoYPlacaConfig((c) => {
        const base = c ?? Object.fromEntries(DIAS_SEMANA.map((d) => [d, { digitos: [] }]))
        setTextoPorDia((prev) => prev ?? Object.fromEntries(DIAS_SEMANA.map((d) => [d, (base[d]?.digitos ?? []).join(', ')])))
      }),
    []
  )

  if (!textoPorDia) return null

  async function handleGuardar() {
    const config = Object.fromEntries(
      DIAS_SEMANA.map((dia) => [dia, { digitos: textoPorDia[dia].split(',').map((d) => d.trim()).filter(Boolean) }])
    )
    await guardarPicoYPlacaConfig(config)
    setMensaje('Guardado.')
  }

  return (
    <Tarjeta animar className="p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Pico y placa (Medellín)</h2>
      <p className="text-xs text-gray-500">
        Verifica que estos dígitos/días correspondan a la norma vigente antes de confiar en el bloqueo automático. Vehículos eléctricos/híbridos quedan
        exentos automáticamente.
      </p>
      {DIAS_SEMANA.map((dia) => (
        <div key={dia} className="flex items-center gap-2 text-xs">
          <span className="w-20 capitalize text-gray-600">{dia}</span>
          <input
            placeholder="dígitos, ej: 1, 2"
            value={textoPorDia[dia]}
            onChange={(e) => setTextoPorDia({ ...textoPorDia, [dia]: e.target.value })}
            className={`flex-1 ${INPUT_SM}`}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Boton onClick={handleGuardar}>Guardar</Boton>
        {mensaje && <p className="text-xs text-gray-500">{mensaje}</p>}
      </div>
    </Tarjeta>
  )
}

export default function AdminPage() {
  const [equipos, setEquipos] = useState([])
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => suscribirEquipos(setEquipos), [])
  useEffect(() => suscribirUsuarios(setUsuarios), [])

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-lg font-semibold text-gray-900">Administración</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SeccionEquipos equipos={equipos} usuarios={usuarios} />
        <SeccionUsuarios equipos={equipos} />
        <SeccionUsuariosExistentes usuarios={usuarios} equipos={equipos} />
        <SeccionPicoYPlaca />
      </div>
    </div>
  )
}
