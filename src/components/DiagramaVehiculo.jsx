// Guía visual: de qué lado se debe tomar cada foto. Vista del carro desde
// arriba, con las 4 posiciones exteriores alrededor (la de kilometraje no
// tiene lado — se explica aparte en la etiqueta del campo).
export default function DiagramaVehiculo() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-y-1 max-w-[180px] mx-auto py-1">
      <div />
      <span className="text-[11px] font-medium text-gray-500">Frente</span>
      <div />

      <span className="text-[11px] font-medium text-gray-500 -rotate-90 whitespace-nowrap">Lat. izq.</span>
      <svg viewBox="0 0 24 40" className="w-7 h-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="2" width="18" height="36" rx="7" />
        <rect x="0" y="7" width="4" height="8" rx="1.5" fill="currentColor" stroke="none" />
        <rect x="20" y="7" width="4" height="8" rx="1.5" fill="currentColor" stroke="none" />
        <rect x="0" y="25" width="4" height="8" rx="1.5" fill="currentColor" stroke="none" />
        <rect x="20" y="25" width="4" height="8" rx="1.5" fill="currentColor" stroke="none" />
      </svg>
      <span className="text-[11px] font-medium text-gray-500 rotate-90 whitespace-nowrap">Lat. der.</span>

      <div />
      <span className="text-[11px] font-medium text-gray-500">Trasero</span>
      <div />
    </div>
  )
}
