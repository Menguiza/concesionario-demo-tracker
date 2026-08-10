import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { enviarCorreoRestablecerPassword } from '../features/usuarios/usuariosApi'

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
    <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Recuperar contraseña</h1>
      <p className="text-sm text-gray-600">Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.</p>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>
      {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-gray-900 text-white py-2 font-medium disabled:opacity-50"
      >
        {enviando ? 'Enviando…' : 'Enviar enlace'}
      </button>
      <button type="button" onClick={onVolver} className="w-full text-sm text-gray-500 underline">
        Volver a iniciar sesión
      </button>
    </form>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarOlvide, setMostrarOlvide] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch {
      setError('Correo o contraseña incorrectos.')
    } finally {
      setEnviando(false)
    }
  }

  if (mostrarOlvide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <FormularioOlvideContrasena onVolver={() => setMostrarOlvide(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">Iniciar sesión</h1>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-gray-900 text-white py-2 font-medium disabled:opacity-50"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <button type="button" onClick={() => setMostrarOlvide(true)} className="w-full text-sm text-gray-500 underline">
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  )
}
