import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase/config'

export function suscribirPicoYPlacaConfig(callback) {
  return onSnapshot(doc(db, 'picoYPlacaConfig', 'actual'), (snap) => {
    callback(snap.exists() ? snap.data() : null)
  })
}

export function guardarPicoYPlacaConfig(config) {
  return setDoc(doc(db, 'picoYPlacaConfig', 'actual'), config)
}
