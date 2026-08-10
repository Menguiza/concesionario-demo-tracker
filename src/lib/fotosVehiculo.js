// Único lugar que define qué fotos son obligatorias al registrar un
// movimiento (entrega/recepción) y cómo se llaman — lo usan el formulario de
// captura y el generador de reportes Excel, para no tener el mismo listado
// duplicado y desincronizado en dos lugares.
export const LADOS_FOTO = [
  { key: 'frente', label: 'Frente' },
  { key: 'lateralIzq', label: 'Lateral izquierdo' },
  { key: 'lateralDer', label: 'Lateral derecho' },
  { key: 'trasero', label: 'Trasero' },
  { key: 'kilometraje', label: 'Kilometraje' },
]

export function fotosFaltantes(fotos) {
  return LADOS_FOTO.filter(({ key }) => !fotos?.[key])
}

// Normaliza el campo `fotos` de un movimiento a la forma esperada por angulo.
// Movimientos creados antes de este cambio guardaron `fotos` como un arreglo
// plano sin ángulo — esos quedan disponibles en `otras` para no perder esa
// evidencia en los reportes.
export function normalizarFotos(fotos) {
  const vacio = { frente: null, lateralIzq: null, lateralDer: null, trasero: null, kilometraje: null, otras: [] }
  if (!fotos) return vacio
  if (Array.isArray(fotos)) return { ...vacio, otras: fotos }
  return { ...vacio, ...fotos, otras: [] }
}
