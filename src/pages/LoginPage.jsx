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
      <div className="w-14 h-14 rounded-2xl bg-brand-900 flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 32 32" className="w-8 h-8">
          <circle cx="13.5" cy="13" r="6.25" fill="none" stroke="#F5F1E8" strokeWidth="2.3" />
          <circle cx="13.5" cy="13" r="2" fill="#D3AD74" />
          <path d="M18.2 17.7 L24.5 24" stroke="#F5F1E8" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="font-marca text-3xl font-semibold text-gray-900 tracking-tight">Rotaflota</h1>
      <p className="text-xs text-gray-400 -mt-2">Gestión de comerciales y flota</p>
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
    } catch (err) {
      // El mensaje al usuario se queda genérico a propósito (no delatar si un
      // correo tiene cuenta o no), pero el error real se registra en consola
      // para poder diagnosticar — antes se perdía por completo (catch sin
      // parámetro), así que un fallo de verdad (dominio no autorizado, cuota
      // de Firebase) se veía idéntico a un envío exitoso.
      console.error('No se pudo enviar el correo de restablecer contraseña:', err)
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
    'min-h-screen flex items-center justify-center px-4 bg-gray-50 bg-[radial-gradient(circle_at_top,_rgba(168,114,47,0.08),_transparent_60%)]'

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
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500/15"
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
