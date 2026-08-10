import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setPerfil(null)
        setCargando(false)
      }
    })
    return unsubscribeAuth
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    setCargando(true)
    const unsubscribePerfil = onSnapshot(doc(db, 'usuarios', firebaseUser.uid), (snap) => {
      setPerfil(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setCargando(false)
    })
    return unsubscribePerfil
  }, [firebaseUser])

  const value = {
    firebaseUser,
    perfil,
    rol: perfil?.rol ?? null,
    cargando,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
