import { useEffect, useState } from 'react'
import { suscribirEquipos, crearEquipo, actualizarMiembrosEquipo } from '../features/equipos/equiposApi'
import { suscribirUsuarios, crearUsuarioStaff, actualizarUsuario } from '../features/usuarios/usuariosApi'
import { suscribirPicoYPlacaConfig, guardarPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { DIAS_SEMANA } from '../lib/horario'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'

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
        <div key={dia} className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 w-24 capitalize">
            <input
              type="checkbox"
              checked={horario[dia].activo}
              onChange={(e) => onChange({ ...horario, [dia]: { ...horario[dia], activo: e.target.checked } })}
            />
            {dia}
          </label>
          <input
            type="time"
            value={horario[dia].inicio}
            disabled={!horario[dia].activo}
            onChange={(e) => onChange({ ...horario, [dia]: { ...horario[dia], inicio: e.target.value } })}
            className="rounded border border-gray-300 px-1 py-0.5"
          />
          <input
            type="time"
            value={horario[dia].fin}
            disabled={!horario[dia].activo}
            onChange={(e) => onChange({ ...horario, [dia]: { ...horario[dia], fin: e.target.value } })}
            className="rounded border border-gray-300 px-1 py-0.5"
          />
        </div>
      ))}
      {!tieneAlgunDiaActivo(horario) && (
        <p className="text-xs text-amber-700">
          Sin ningún día activo, este comercial no va a poder recibir clientes en la cola.
        </p>
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
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Equipos</h2>
      <p className="text-xs text-gray-500">Un comercial puede estar en varios equipos — se marca aquí, este es el único lugar donde se edita.</p>
      <form onSubmit={handleCrear} className="flex gap-2">
        <input
          required
          placeholder="Nombre del equipo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm">
          Crear
        </button>
      </form>
      {equipos.map((equipo) => (
        <div key={equipo.id} className="border-t border-gray-100 pt-2">
          <p className="text-sm font-medium text-gray-900">{equipo.nombre}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {comerciales.map((c) => {
              const otros = otrosEquiposDe(c.id, equipo.id)
              return (
                <label key={c.id} className="flex items-center gap-1 text-xs bg-gray-50 rounded-full px-2 py-1">
                  <input type="checkbox" checked={equipo.miembros.includes(c.id)} onChange={() => toggleMiembro(equipo, c.id)} />
                  {c.nombre}
                  {otros.length > 0 && <span className="text-amber-700">· también en: {otros.join(', ')}</span>}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </section>
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
          ? `Cuenta creada para ${nombre}. Le va a llegar un correo para poner su contraseña.`
          : `Cuenta creada para ${nombre}, pero no se pudo enviar el correo de contraseña (puede que Firebase esté limitando envíos por ahora). Puede entrar con la contraseña temporal, o más tarde usar "Olvidaste tu contraseña" en el login.`
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
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Crear cuenta de staff</h2>
      <form onSubmit={handleCrear} className="space-y-2" autoComplete="off">
        <input required placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        {rol !== 'admin' && (
          <input
            required
            type="tel"
            placeholder="Número de contacto"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres. La persona la puede cambiar después.</p>
        </div>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="comercial">Comercial</option>
          <option value="anfitriona">Anfitriona</option>
          <option value="directivo">Directivo</option>
          <option value="admin">Admin</option>
        </select>
        {rol === 'comercial' && (
          <>
            <div>
              <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
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
          </>
        )}
        <button type="submit" disabled={enviando} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {enviando ? 'Creando…' : 'Crear cuenta'}
        </button>
        {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
      </form>
    </section>
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
          onClick={() => esComercial && setExpandido((v) => !v)}
          className={`flex-1 text-left ${esComercial ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <p className="text-sm font-medium text-gray-900">
            {esComercial && <span className="text-gray-400 mr-1">{expandido ? '▾' : '▸'}</span>}
            {usuario.nombre}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {usuario.rol}
            {equiposDelComercial.length > 0 && ` · ${equiposDelComercial.join(', ')}`}
            {esComercial && equiposDelComercial.length === 0 && ' · sin equipo'}
          </p>
        </button>
        <label className="flex items-center gap-1 text-xs shrink-0">
          <input type="checkbox" checked={usuario.activo !== false} onChange={toggleActivo} />
          Activo
        </label>
      </div>

      {usuario.rol !== 'admin' && (
        <div className="flex items-center gap-2">
          <input
            type="tel"
            placeholder="Número de contacto"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="flex-1 text-xs rounded-lg border border-gray-300 px-2 py-1"
          />
          <button
            onClick={handleGuardarTelefono}
            disabled={guardandoTelefono}
            className="text-xs rounded-lg bg-gray-900 text-white px-2 py-1 disabled:opacity-50 shrink-0"
          >
            {guardandoTelefono ? 'Guardando…' : 'Guardar'}
          </button>
          {mensajeTelefono && <span className="text-xs text-gray-500 shrink-0">{mensajeTelefono}</span>}
        </div>
      )}

      {esComercial && expandido && (
        <div className="mt-2 pl-4 space-y-2">
          <EditorHorario horario={horario} onChange={setHorario} />
          <div className="flex items-center gap-2">
            <button
              onClick={handleGuardarHorario}
              disabled={guardando}
              className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar horario'}
            </button>
            {mensaje && <p className="text-xs text-gray-500">{mensaje}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function SeccionUsuariosExistentes({ usuarios, equipos }) {
  if (usuarios.length === 0) return null
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-1">
      <h2 className="text-sm font-semibold text-gray-900">Staff existente</h2>
      <p className="text-xs text-gray-500 mb-2">
        Toca un comercial para editar su horario. El equipo se cambia desde la sección "Equipos".
      </p>
      {usuarios.map((u) => (
        <FilaUsuarioExistente key={u.id} usuario={u} equipos={equipos} />
      ))}
    </section>
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
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Pico y placa (Medellín)</h2>
      <p className="text-xs text-gray-500">
        Verifica que estos dígitos/días correspondan a la norma vigente antes de confiar en el bloqueo automático. Vehículos eléctricos/híbridos quedan
        exentos automáticamente.
      </p>
      {DIAS_SEMANA.map((dia) => (
        <div key={dia} className="flex items-center gap-2 text-xs">
          <span className="w-20 capitalize">{dia}</span>
          <input
            placeholder="dígitos, ej: 1, 2"
            value={textoPorDia[dia]}
            onChange={(e) => setTextoPorDia({ ...textoPorDia, [dia]: e.target.value })}
            className="flex-1 rounded border border-gray-300 px-2 py-1"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button onClick={handleGuardar} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm">
          Guardar
        </button>
        {mensaje && <p className="text-xs text-gray-500">{mensaje}</p>}
      </div>
    </section>
  )
}

export default function AdminPage() {
  const [equipos, setEquipos] = useState([])
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => suscribirEquipos(setEquipos), [])
  useEffect(() => suscribirUsuarios(setUsuarios), [])

  return (
    <div className="space-y-6">
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
