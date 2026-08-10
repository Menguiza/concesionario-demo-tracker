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
