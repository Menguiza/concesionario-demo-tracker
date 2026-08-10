export default function Tarjeta({ children, className = '', interactiva = false, animar = false, style, ...props }) {
  return (
    <div
      style={style}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${
        interactiva ? 'transition-all duration-150 hover:shadow-md hover:border-gray-300' : ''
      } ${animar ? 'animate-slide-up' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
