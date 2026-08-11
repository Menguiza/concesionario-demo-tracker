import { diaActual, DIAS_SEMANA } from './horario'

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

// Qué días de la semana le aplica pico y placa a este vehículo (fijo, no
// depende de una fecha) — para mostrarlo directo en la tarjeta del vehículo.
export function diasSemanaPicoYPlaca(vehiculo, config) {
  if (vehiculo.esElectricoHibrido) return []
  const ultimoDigito = vehiculo.placa?.trim().slice(-1)
  return DIAS_SEMANA.filter((dia) => config?.[dia]?.digitos?.includes(ultimoDigito))
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
