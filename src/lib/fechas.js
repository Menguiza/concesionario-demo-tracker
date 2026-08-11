// new Date("2026-08-13") se interpreta como medianoche UTC, no local — en
// Colombia (UTC-5) eso cae en el día anterior. Los inputs type="date" dan
// "YYYY-MM-DD"; esto lo arma como fecha local para evitar ese corrimiento.
export function parseFechaLocal(yyyyMmDd) {
  const [anio, mes, dia] = yyyyMmDd.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

// Igual que arriba pero al revés: arma "YYYY-MM-DD" a partir de los
// componentes locales de la fecha, nunca uses fecha.toISOString() para esto
// porque convierte a UTC y corre el día cerca del final de la tarde/noche.
export function fechaLocalYYYYMMDD(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

// "martes 11 de agosto de 2026" — para donde una fecha corta (11/8/2026) no
// deja ver de una a qué día de la semana corresponde.
export function formatoFechaLarga(fecha) {
  return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function rangoSemanaPasada(ahora = new Date()) {
  const diffAlLunes = (ahora.getDay() + 6) % 7
  const lunesEstaSemana = new Date(ahora)
  lunesEstaSemana.setHours(0, 0, 0, 0)
  lunesEstaSemana.setDate(ahora.getDate() - diffAlLunes)

  const lunesPasado = new Date(lunesEstaSemana)
  lunesPasado.setDate(lunesEstaSemana.getDate() - 7)

  const finSemanaPasada = new Date(lunesEstaSemana.getTime() - 1)

  return { desde: lunesPasado, hasta: finSemanaPasada }
}
