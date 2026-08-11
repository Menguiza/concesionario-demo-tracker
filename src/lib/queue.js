export function construirOrdenInicial(comerciales) {
  return [...comerciales]
    .sort((a, b) => {
      const diff = (a.clientesEfectivosDiaAnterior ?? 0) - (b.clientesEfectivosDiaAnterior ?? 0)
      if (diff !== 0) return diff
      const ha = a.horaLlegadaHoy ? new Date(a.horaLlegadaHoy).getTime() : Infinity
      const hb = b.horaLlegadaHoy ? new Date(b.horaLlegadaHoy).getTime() : Infinity
      return ha - hb
    })
    .map((c) => c.id)
}

// Equipos alternan por día hábil en un ciclo estable (orden alfabético, no el
// de llegada a Firestore): equipoInicialId es el equipo elegido manualmente
// como ancla, y `pasos` es cuántos días hábiles pasaron desde esa ancla.
export function elegirEquipoDelDia(equipos, equipoInicialId, pasos) {
  const ordenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const indiceInicial = ordenados.findIndex((e) => e.id === equipoInicialId)
  if (indiceInicial === -1) return equipoInicialId
  const indice = (indiceInicial + pasos) % ordenados.length
  return ordenados[indice].id
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
