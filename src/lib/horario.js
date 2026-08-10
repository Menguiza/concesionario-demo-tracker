const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export function diaActual(ahora = new Date()) {
  return DIAS[ahora.getDay()]
}

export function estaEnHorario(horarioSemanal, ahora = new Date()) {
  const bloque = horarioSemanal?.[diaActual(ahora)]
  if (!bloque || !bloque.activo) return false
  const hhmm = ahora.toTimeString().slice(0, 5)
  return hhmm >= bloque.inicio && hhmm <= bloque.fin
}

export const DIAS_SEMANA = DIAS
