export function construirOrdenInicial(comerciales) {
  return [...comerciales]
    .sort((a, b) => {
      const diff = (a.clientesEfectivosSemanaPasada ?? 0) - (b.clientesEfectivosSemanaPasada ?? 0)
      if (diff !== 0) return diff
      const ha = a.horaLlegadaHoy ? new Date(a.horaLlegadaHoy).getTime() : Infinity
      const hb = b.horaLlegadaHoy ? new Date(b.horaLlegadaHoy).getTime() : Infinity
      return ha - hb
    })
    .map((c) => c.id)
}

// Recorre la cola desde el frente. Los que están ocupados se saltan pero vuelven
// a la cabeza (no pierden su lugar); los que no están en horario simplemente se
// ignoran sin reordenar. El elegido pasa al final, como cualquier turno consumido.
export function elegirYRotar(orden, idsOcupados, idsEnHorario) {
  const saltadosPorOcupado = []
  let elegido = null

  for (const id of orden) {
    if (!idsEnHorario.has(id)) continue
    if (idsOcupados.has(id)) {
      saltadosPorOcupado.push(id)
      continue
    }
    elegido = id
    break
  }

  if (!elegido) return { elegido: null, nuevoOrden: orden }

  const resto = orden.filter((id) => id !== elegido && !saltadosPorOcupado.includes(id))
  return { elegido, nuevoOrden: [...saltadosPorOcupado, ...resto, elegido] }
}

// Cliente nuevo que pide un comercial específico: consume turno como una asignación normal.
export function asignarComercialEspecifico(orden, comercialId) {
  const resto = orden.filter((id) => id !== comercialId)
  return [...resto, comercialId]
}

// Cliente recurrente que pide un comercial específico: no toca la cola.
export function pasarSinConsumirCola(orden) {
  return orden
}
