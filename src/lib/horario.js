const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Etiquetas para mostrar (con tilde) — las claves internas van sin tilde
// porque toLocaleString('es', {weekday:'long'}) no siempre calza 1:1 con
// estas claves en todos los navegadores.
export const ETIQUETA_DIA = {
  domingo: 'Domingo',
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
}

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
