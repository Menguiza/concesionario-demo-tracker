const TAMANOS = { xs: 'w-3.5 h-3.5', sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export default function Spinner({ size = 'sm', className = '' }) {
  return (
    <svg className={`animate-spin ${TAMANOS[size]} ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
