const ESTILOS = {
  error: 'bg-red-50 text-red-700 border-red-200',
  exito: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-gray-50 text-gray-600 border-gray-200',
  advertencia: 'bg-amber-50 text-amber-800 border-amber-200',
}

export default function Alerta({ tipo = 'info', children, className = '' }) {
  if (!children) return null
  return (
    <div className={`text-sm rounded-lg border px-3 py-2 animate-slide-up ${ESTILOS[tipo]} ${className}`}>{children}</div>
  )
}
