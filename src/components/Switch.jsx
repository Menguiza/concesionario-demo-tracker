const COLORES_ON = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  brand: 'bg-brand-600',
}

const COLORES_TEXTO_ON = {
  emerald: 'text-emerald-700',
  blue: 'text-blue-700',
  brand: 'text-brand-700',
}

// Interruptor que nombra el ESTADO actual, no la acción a tomar (evita el
// típico botón ambiguo "Marcar X" donde no queda claro si X es lo que va a
// pasar o lo que ya está pasando). El texto entero + el track son un solo
// área de toque, cómoda en móvil.
// label: texto fijo para un toggle de sí/no (ej. "¿Fue delegado?" — la
// pregunta no cambia, solo la respuesta). labelOn/labelOff: para cuando el
// texto SÍ debe nombrar el estado (ej. "Disponible"/"Ocupado"). Se usa uno
// u otro según el caso, nunca los dos.
export default function Switch({ checked, onChange, label, labelOn, labelOff, color = 'emerald', className = '' }) {
  const texto = label ?? (checked ? labelOn : labelOff)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 shrink-0 py-1 ${className}`}
    >
      <span className={`text-xs font-medium transition-colors ${checked ? COLORES_TEXTO_ON[color] : 'text-gray-500'}`}>{texto}</span>
      <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? COLORES_ON[color] : 'bg-gray-300'}`}>
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
