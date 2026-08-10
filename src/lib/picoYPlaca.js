import { diaActual } from './horario'

// picoYPlacaConfig: { [dia]: { digitos: string[], horaInicio?: 'HH:mm', horaFin?: 'HH:mm' } }
// Editable por admin en Firestore — la norma de Medellín cambia periódicamente,
// este módulo solo evalúa la config vigente, no la asume fija.
export function estaBloqueadoPorPicoYPlaca(vehiculo, config, ahora = new Date()) {
  if (vehiculo.esElectricoHibrido) return false

  const ultimoDigito = vehiculo.placa?.trim().slice(-1)
  const regla = config?.[diaActual(ahora)]
  if (!regla || !regla.digitos?.includes(ultimoDigito)) return false
  if (!regla.horaInicio || !regla.horaFin) return true

  const hhmm = ahora.toTimeString().slice(0, 5)
  return hhmm >= regla.horaInicio && hhmm <= regla.horaFin
}
