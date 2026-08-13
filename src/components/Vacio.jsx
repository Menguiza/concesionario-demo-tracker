export default function Vacio({ titulo, descripcion }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-brand-400">
          <path
            d="M4 12h4l1.5 3h5L16 12h4M4 12l1.5-6.5A1.5 1.5 0 017 4.5h10a1.5 1.5 0 011.5 1L20 12M4 12v5.5A1.5 1.5 0 005.5 19h13a1.5 1.5 0 001.5-1.5V12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      {descripcion && <p className="text-xs text-gray-400 mt-1 max-w-xs">{descripcion}</p>}
    </div>
  )
}
