import Badge from './Badge'

// Solo lectura — pastillas con el nombre de cada etiqueta que tiene la
// persona. Ids que ya no existen en el catálogo (etiqueta borrada) se
// omiten en silencio en vez de mostrar un id crudo.
export default function EtiquetasChips({ tagIds, etiquetasPorId, className = '' }) {
  const nombres = (tagIds ?? []).map((id) => etiquetasPorId[id]?.nombre).filter(Boolean)
  if (nombres.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {nombres.map((nombre) => (
        <Badge key={nombre} color="gray">
          {nombre}
        </Badge>
      ))}
    </div>
  )
}
