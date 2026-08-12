// Paleta propia para etiquetas de comerciales (no la de Badge — esa tiene
// significado de estado: verde = activo/efectivo, ámbar = en uso, rojo =
// incumplida... reusarla aquí mezclaría dos lenguajes visuales distintos).
// Colores suaves, pensados para leerse como categoría, no como alerta.
const PALETA = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
  'bg-fuchsia-100 text-fuchsia-700',
]

// Determinístico: la misma etiqueta siempre sale del mismo color en toda la
// app (Comerciales, Cola, catálogo de Admin), sin tener que guardar un color
// aparte en Firestore.
export function colorDeEtiqueta(id) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETA[hash % PALETA.length]
}
