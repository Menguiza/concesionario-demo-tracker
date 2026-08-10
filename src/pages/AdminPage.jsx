import { useEffect, useState } from 'react'
import { suscribirEquipos, crearEquipo, actualizarMiembrosEquipo } from '../features/equipos/equiposApi'
import { suscribirUsuarios, crearUsuarioStaff } from '../features/usuarios/usuariosApi'
import { suscribirPicoYPlacaConfig, guardarPicoYPlacaConfig } from '../features/picoYPlaca/picoYPlacaApi'
import { DIAS_SEMANA } from '../lib/horario'

function horarioVacio() {
  return Object.fromEntries(DIAS_SEMANA.map((d) => [d, { activo: false, inicio: '08:00', fin: '18:00' }]))
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

  const comerciales = usuarios.filter((u) => u.rol === 'comercial')

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Equipos</h2>
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
            {comerciales.map((c) => (
              <label key={c.id} className="flex items-center gap-1 text-xs bg-gray-50 rounded-full px-2 py-1">
                <input type="checkbox" checked={equipo.miembros.includes(c.id)} onChange={() => toggleMiembro(equipo, c.id)} />
                {c.nombre}
              </label>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function SeccionUsuarios({ equipos }) {
  const [nombre, setNombre] = useState('')
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
      await crearUsuarioStaff({
        email,
        password,
        nombre,
        rol,
        equipoId: rol === 'comercial' ? equipoId || null : null,
        horarioSemanal: rol === 'comercial' ? horario : null,
      })
      setMensaje(`Cuenta creada para ${nombre}.`)
      setNombre('')
      setEmail('')
      setPassword('')
      setHorario(horarioVacio())
    } catch (err) {
      setMensaje(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">Crear cuenta de staff</h2>
      <form onSubmit={handleCrear} className="space-y-2">
        <input required placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input required type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input required type="password" placeholder="Contraseña temporal" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <select value={rol} onChange={(e) => setRol(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="comercial">Comercial</option>
          <option value="anfitriona">Anfitriona</option>
          <option value="admin">Admin</option>
        </select>
        {rol === 'comercial' && (
          <>
            <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Sin equipo (asignar después)</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre}
                </option>
              ))}
            </select>
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

function SeccionPicoYPlaca() {
  const [config, setConfig] = useState(null)

  useEffect(() => suscribirPicoYPlacaConfig((c) => setConfig(c ?? Object.fromEntries(DIAS_SEMANA.map((d) => [d, { digitos: [], horaInicio: '', horaFin: '' }])))), [])

  if (!config) return null

  function handleDigitosChange(dia, valor) {
    setConfig({ ...config, [dia]: { ...config[dia], digitos: valor.split(',').map((d) => d.trim()).filter(Boolean) } })
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
            placeholder="dígitos, ej: 1,2"
            value={(config[dia]?.digitos ?? []).join(', ')}
            onChange={(e) => handleDigitosChange(dia, e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1"
          />
        </div>
      ))}
      <button onClick={() => guardarPicoYPlacaConfig(config)} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm">
        Guardar
      </button>
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
      <SeccionEquipos equipos={equipos} usuarios={usuarios} />
      <SeccionUsuarios equipos={equipos} />
      <SeccionPicoYPlaca />
    </div>
  )
}
