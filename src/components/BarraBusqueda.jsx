import { IconoBuscar, IconoCerrar } from '../lib/iconos'

export default function BarraBusqueda({ valor, onChange, placeholder = 'Buscar...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <IconoBuscar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 pl-9 pr-8 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-400"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
        >
          <IconoCerrar className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
