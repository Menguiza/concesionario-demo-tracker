// new Date("2026-08-13") se interpreta como medianoche UTC, no local — en
// Colombia (UTC-5) eso cae en el día anterior. Los inputs type="date" dan
// "YYYY-MM-DD"; esto lo arma como fecha local para evitar ese corrimiento.
export function parseFechaLocal(yyyyMmDd) {
  const [anio, mes, dia] = yyyyMmDd.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
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
