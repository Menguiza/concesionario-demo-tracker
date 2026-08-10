// Para comparar texto en búsquedas sin que importen mayúsculas ni tildes
// (que alguien busque "fandino" y encuentre "Fandiño"). Mapa explícito en
// vez de una clase de regex con marcas diacríticas — esas se corrompen
// fácil según el editor/encoding que las toque.
const MAPA_ACENTOS = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' }

export function normalizarTexto(valor) {
  return (valor ?? '')
    .toString()
    .toLowerCase()
    .split('')
    .map((c) => MAPA_ACENTOS[c] ?? c)
    .join('')
}

export function coincideBusqueda(texto, busqueda) {
  if (!busqueda.trim()) return true
  return normalizarTexto(texto).includes(normalizarTexto(busqueda))
}
