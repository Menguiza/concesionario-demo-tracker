import { fechaLocalYYYYMMDD } from './fechas'

// Agrupa por día local (no UTC) y ordena: días más recientes primero, pero
// dentro de cada día los clientes quedan en el orden en que se registraron.
export function agruparClientesPorDia(clientes) {
  const conFecha = clientes.filter((c) => c.fechaHora)
  const ordenados = [...conFecha].sort((a, b) => a.fechaHora.seconds - b.fechaHora.seconds)

  const grupos = new Map()
  for (const c of ordenados) {
    const fecha = c.fechaHora.toDate()
    const clave = fechaLocalYYYYMMDD(fecha)
    if (!grupos.has(clave)) grupos.set(clave, { fecha, clientes: [] })
    grupos.get(clave).clientes.push(c)
  }

  return [...grupos.values()].sort((a, b) => b.fecha - a.fecha)
}

export function formatoTituloDia(fecha) {
  const texto = fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
