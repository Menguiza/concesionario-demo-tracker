// El concesionario atiende de lunes a sábado (domingo cerrado). Estas
// funciones existen para la rotación diaria automática de equipos y para
// saber cuál es "el día hábil inmediatamente anterior" al calcular el orden
// de la cola — sin asumir que ayer siempre fue un día hábil.
export function esDiaHabil(fecha) {
  return fecha.getDay() !== 0
}

export function diaHabilAnterior(fecha) {
  const anterior = new Date(fecha)
  anterior.setDate(anterior.getDate() - 1)
  if (anterior.getDay() === 0) anterior.setDate(anterior.getDate() - 1)
  return anterior
}

// Cuántos días hábiles hay estrictamente entre `desde` (exclusivo) y `hasta`
// (inclusivo) — es la cantidad de "pasos" de rotación que debieron ocurrir.
export function pasosHabilesDesde(desde, hasta) {
  let pasos = 0
  const cursor = new Date(desde)
  cursor.setHours(0, 0, 0, 0)
  const fin = new Date(hasta)
  fin.setHours(0, 0, 0, 0)
  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1)
    if (cursor.getDay() !== 0) pasos++
  }
  return pasos
}
