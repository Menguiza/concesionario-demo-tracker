import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { INPUT } from '../lib/estilos'
import Tarjeta from '../components/Tarjeta'
import Boton from '../components/Boton'
import Alerta from '../components/Alerta'

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
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h1>
      <Tarjeta animar className="max-w-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contraseña actual</label>
            <input type="password" required value={actual} onChange={(e) => setActual(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contraseña nueva</label>
            <input
              type="password"
              required
              minLength={6}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={INPUT}
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
              className={INPUT}
            />
          </div>
          <Alerta tipo="error">{error}</Alerta>
          <Boton type="submit" cargando={enviando} className="w-full">
            {enviando ? 'Guardando…' : 'Cambiar contraseña'}
          </Boton>
        </form>
      </Tarjeta>
    </div>
  )
}
