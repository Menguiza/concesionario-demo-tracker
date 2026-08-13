import Spinner from './Spinner'

const VARIANTES = {
  primario: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-gray-300 shadow-sm',
  secundario: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50',
  peligro: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 shadow-sm',
  suave: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50',
  fantasma: 'text-gray-500 hover:text-gray-900 underline underline-offset-2 disabled:opacity-50',
}

const TAMANOS = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
}

export default function Boton({ variante = 'primario', tamano = 'md', cargando = false, className = '', children, disabled, ...props }) {
  return (
    <button
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 disabled:cursor-not-allowed active:scale-[0.97] ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`}
      {...props}
    >
      {cargando && <Spinner size="xs" />}
      {children}
    </button>
  )
}
