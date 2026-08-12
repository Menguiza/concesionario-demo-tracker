import { colorDeEtiqueta } from '../lib/coloresEtiquetas'

// Solo lectura — pastillas con el nombre de cada etiqueta que tiene la
// persona. Ids que ya no existen en el catálogo (etiqueta borrada) se
// omiten en silencio en vez de mostrar un id crudo.
export default function EtiquetasChips({ tagIds, etiquetasPorId, className = '' }) {
  const etiquetas = (tagIds ?? []).map((id) => etiquetasPorId[id]).filter(Boolean)
  if (etiquetas.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {etiquetas.map((t) => (
        <span key={t.id} className={`text-[11px] font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${colorDeEtiqueta(t.id)}`}>
          {t.nombre}
        </span>
      ))}
    </div>
  )
}
