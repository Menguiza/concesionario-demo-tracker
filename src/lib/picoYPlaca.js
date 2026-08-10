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

// Para chequeos a futuro (reservas): qué días dentro de un rango caen en
// pico y placa para este vehículo, sin depender de la hora actual.
export function diasBloqueadosPorPicoYPlacaEnRango(vehiculo, config, fechaInicio, fechaFin) {
  if (vehiculo.esElectricoHibrido) return []

  const ultimoDigito = vehiculo.placa?.trim().slice(-1)
  const dias = []
  const cursor = new Date(fechaInicio)
  cursor.setHours(0, 0, 0, 0)
  const fin = new Date(fechaFin)
  fin.setHours(0, 0, 0, 0)

  while (cursor <= fin) {
    const regla = config?.[diaActual(cursor)]
    if (regla?.digitos?.includes(ultimoDigito)) {
      dias.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dias
}
