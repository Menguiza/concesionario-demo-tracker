export default function Vacio({ titulo, descripcion }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 animate-fade-in">
      <div className="w-10 h-10 rounded-full bg-gray-100 mb-3" />
      <p className="text-sm font-medium text-gray-500">{titulo}</p>
      {descripcion && <p className="text-xs text-gray-400 mt-1 max-w-xs">{descripcion}</p>}
    </div>
  )
}
