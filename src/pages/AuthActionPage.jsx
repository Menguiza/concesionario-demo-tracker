import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyPasswordResetCode, confirmPasswordReset, applyActionCode, checkActionCode } from 'firebase/auth'
import { auth } from '../firebase/config'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
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
    </div>
  )
}

function Cascaron({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 bg-[radial-gradient(circle_at_top,_rgba(168,114,47,0.08),_transparent_60%)]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg shadow-gray-900/5 border border-gray-100 p-7 space-y-4 animate-scale-in">
        <Marca />
        {children}
      </div>
    </div>
  )
}

// Reemplaza la página genérica que Firebase Hosting muestra por defecto al
// hacer clic en el enlace de un correo de autenticación (restablecer
// contraseña, verificar correo, deshacer un cambio de correo) — ver
// configuracionAccionCorreo() en usuariosApi.js, que manda a esta ruta con
// handleCodeInApp:true en vez de al handler default de Firebase.
export default function AuthActionPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode')
  const oobCode = params.get('oobCode')

  if (!mode || !oobCode) {
    return (
      <Cascaron>
        <Alerta tipo="error">Este enlace no es válido o está incompleto. Pide uno nuevo desde la pantalla de inicio de sesión.</Alerta>
        <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Volver a iniciar sesión
        </Link>
      </Cascaron>
    )
  }

  if (mode === 'resetPassword') return <RestablecerContrasena oobCode={oobCode} />
  if (mode === 'verifyEmail') return <VerificarCorreo oobCode={oobCode} />
  if (mode === 'recoverEmail') return <RecuperarCorreo oobCode={oobCode} />

  return (
    <Cascaron>
      <Alerta tipo="error">Este tipo de enlace no se reconoce. Pide uno nuevo desde la pantalla de inicio de sesión.</Alerta>
      <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
        Volver a iniciar sesión
      </Link>
    </Cascaron>
  )
}

function RestablecerContrasena({ oobCode }) {
  const [estado, setEstado] = useState('verificando') // verificando | listo | guardado | error
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then((correo) => {
        setEmail(correo)
        setEstado('listo')
      })
      .catch((err) => {
        setError(mensajeErrorAmigable(err))
        setEstado('error')
      })
  }, [oobCode])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    setEnviando(true)
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setEstado('guardado')
    } catch (err) {
      setError(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  if (estado === 'verificando') {
    return (
      <Cascaron>
        <p className="text-sm text-gray-500 text-center">Verificando el enlace…</p>
      </Cascaron>
    )
  }

  if (estado === 'error') {
    return (
      <Cascaron>
        <Alerta tipo="error">{error}</Alerta>
        <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Volver a iniciar sesión
        </Link>
      </Cascaron>
    )
  }

  if (estado === 'guardado') {
    return (
      <Cascaron>
        <Alerta tipo="exito">Listo — tu contraseña quedó actualizada.</Alerta>
        <Link to="/login" className="block">
          <Boton className="w-full">Iniciar sesión</Boton>
        </Link>
      </Cascaron>
    )
  }

  return (
    <Cascaron>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h2 className="text-base font-medium text-gray-900">Nueva contraseña</h2>
          <p className="text-sm text-gray-500 mt-1">Para {email}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Contraseña nueva</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Confírmala</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className={INPUT}
          />
        </div>
        <Alerta tipo="error">{error}</Alerta>
        <Boton type="submit" cargando={enviando} className="w-full">
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Boton>
      </form>
    </Cascaron>
  )
}

function VerificarCorreo({ oobCode }) {
  const [estado, setEstado] = useState('verificando') // verificando | listo | error
  const [error, setError] = useState('')

  useEffect(() => {
    applyActionCode(auth, oobCode)
      .then(() => setEstado('listo'))
      .catch((err) => {
        setError(mensajeErrorAmigable(err))
        setEstado('error')
      })
  }, [oobCode])

  return (
    <Cascaron>
      {estado === 'verificando' && <p className="text-sm text-gray-500 text-center">Verificando tu correo…</p>}
      {estado === 'listo' && (
        <>
          <Alerta tipo="exito">Tu correo quedó verificado.</Alerta>
          <Link to="/login" className="block">
            <Boton className="w-full">Iniciar sesión</Boton>
          </Link>
        </>
      )}
      {estado === 'error' && (
        <>
          <Alerta tipo="error">{error}</Alerta>
          <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Volver a iniciar sesión
          </Link>
        </>
      )}
    </Cascaron>
  )
}

// Se dispara cuando alguien pide deshacer un cambio de correo que no
// reconoce — hoy la app no tiene una pantalla para cambiar el correo propio,
// así que esto es sobre todo un respaldo. Igual se avisa que conviene
// cambiar la contraseña, por si la cuenta quedó comprometida.
function RecuperarCorreo({ oobCode }) {
  const [estado, setEstado] = useState('verificando') // verificando | listo | error
  const [error, setError] = useState('')

  useEffect(() => {
    checkActionCode(auth, oobCode)
      .then(() => applyActionCode(auth, oobCode))
      .then(() => setEstado('listo'))
      .catch((err) => {
        setError(mensajeErrorAmigable(err))
        setEstado('error')
      })
  }, [oobCode])

  return (
    <Cascaron>
      {estado === 'verificando' && <p className="text-sm text-gray-500 text-center">Procesando…</p>}
      {estado === 'listo' && (
        <>
          <Alerta tipo="exito">Tu correo volvió a quedar como estaba.</Alerta>
          <p className="text-xs text-gray-500 text-center">
            Si no reconoces el cambio que intentaron hacer, cambia tu contraseña cuanto antes.
          </p>
          <Link to="/login" className="block">
            <Boton className="w-full">Iniciar sesión</Boton>
          </Link>
        </>
      )}
      {estado === 'error' && (
        <>
          <Alerta tipo="error">{error}</Alerta>
          <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Volver a iniciar sesión
          </Link>
        </>
      )}
    </Cascaron>
  )
}
