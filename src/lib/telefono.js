// tel: sin indicativo de país es ambiguo — según el manejador de llamadas
// que tenga el sistema (celular o PC), puede terminar marcando mal o
// abriendo algo que no es. Se arma en formato E.164 (+57...) que es el que
// se interpreta sin ambigüedad en cualquier lado.
export function enlaceTel(telefono) {
  const soloDigitos = (telefono ?? '').replace(/\D/g, '')
  if (!soloDigitos) return null
  const conIndicativo = soloDigitos.startsWith('57') ? soloDigitos : `57${soloDigitos}`
  return `tel:+${conIndicativo}`
}
