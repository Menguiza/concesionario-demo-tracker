import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'

export default function CambiarPasswordPage() {
  const { firebaseUser } = useAuth()
  const navigate = useNavigate()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (nueva !== confirmar) {
      setError('Las dos contraseñas nuevas no son iguales.')
      return
    }

    setEnviando(true)
    try {
      const credencial = EmailAuthProvider.credential(firebaseUser.email, actual)
      await reauthenticateWithCredential(firebaseUser, credencial)
      await updatePassword(firebaseUser, nueva)
      navigate('/')
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('La contraseña actual no es correcta.')
      } else {
        setError(mensajeErrorAmigable(err))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 max-w-sm">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contraseña actual</label>
          <input
            type="password"
            required
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contraseña nueva</label>
          <input
            type="password"
            required
            minLength={6}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres.</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Confirmar contraseña nueva</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-gray-900 text-white py-2 text-sm font-medium disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
