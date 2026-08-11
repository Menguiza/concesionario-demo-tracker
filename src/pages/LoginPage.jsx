import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { auth } from '../firebase/config'
import { enviarCorreoRestablecerPassword } from '../features/usuarios/usuariosApi'
import { INPUT } from '../lib/estilos'
import Boton from '../components/Boton'
import Alerta from '../components/Alerta'

function Marca() {
  return (
    <div className="flex flex-col items-center gap-3 mb-2">
      <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white">
          <path
            d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13M5 13h14v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="16" r="0.8" fill="currentColor" />
          <circle cx="16.5" cy="16" r="0.8" fill="currentColor" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-gray-900">Gestión de Vehículos</h1>
    </div>
  )
}

function FormularioOlvideContrasena({ onVolver }) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setMensaje('')
    try {
      await enviarCorreoRestablecerPassword(email)
      setMensaje('Si ese correo tiene una cuenta, te llegó un enlace para poner una contraseña nueva. Revisa también spam.')
    } catch {
      setMensaje('Si ese correo tiene una cuenta, te llegó un enlace para poner una contraseña nueva. Revisa también spam.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-lg shadow-gray-900/5 border border-gray-100 p-7 space-y-4 animate-scale-in">
      <Marca />
      <div>
        <h2 className="text-base font-medium text-gray-900">Recuperar contraseña</h2>
        <p className="text-sm text-gray-500 mt-1">Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.</p>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Correo</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
      </div>
      <Alerta tipo="info">{mensaje}</Alerta>
      <Boton type="submit" cargando={enviando} className="w-full">
        {enviando ? 'Enviando…' : 'Enviar enlace'}
      </Boton>
      <button type="button" onClick={onVolver} className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors">
        Volver a iniciar sesión
      </button>
    </form>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recordarme, setRecordarme] = useState(true)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarOlvide, setMostrarOlvide] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      // Se fija la persistencia explícitamente en vez de confiar en el
      // default implícito del SDK — en algunos navegadores de Android la
      // sesión se perdía al salir de foco, esto lo deja sin ambigüedad.
      // Con "recuérdame" sobrevive a cerrar el navegador; sin marcar, se
      // cierra sola al cerrar la pestaña (útil en un equipo compartido).
      await setPersistence(auth, recordarme ? browserLocalPersistence : browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setEnviando(false)
    }
  }

  const fondo =
    'min-h-screen flex items-center justify-center px-4 bg-gray-50 bg-[radial-gradient(circle_at_top,_rgba(17,24,39,0.05),_transparent_60%)]'

  if (mostrarOlvide) {
    return (
      <div className={fondo}>
        <FormularioOlvideContrasena onVolver={() => setMostrarOlvide(false)} />
      </div>
    )
  }

  return (
    <div className={fondo}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg shadow-gray-900/5 border border-gray-100 p-7 space-y-4 animate-scale-in"
      >
        <Marca />
        <div>
          <label className="block text-sm text-gray-600 mb-1">Correo</label>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={recordarme}
            onChange={(e) => setRecordarme(e.target.checked)}
            className="rounded border-gray-300 text-gray-900 focus:ring-gray-900/10"
          />
          Recuérdame en este dispositivo
        </label>
        <Alerta tipo="error">{error}</Alerta>
        <Boton type="submit" cargando={enviando} className="w-full">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Boton>
        <button
          type="button"
          onClick={() => setMostrarOlvide(true)}
          className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  )
}
