import { LADOS_FOTO } from '../lib/fotosVehiculo'
import CampoArchivo from './CampoArchivo'
import DiagramaVehiculo from './DiagramaVehiculo'

// Las 5 fotos obligatorias (4 ángulos exteriores + kilometraje), cada una en
// su propio campo — reemplaza el selector genérico de "varias fotos" para
// que quede claro exactamente qué falta por tomar.
export default function FotosVehiculo({ fotos, onChange }) {
  return (
    <div className="space-y-2.5">
      <DiagramaVehiculo />
      <div className="grid grid-cols-2 gap-2">
        {LADOS_FOTO.map(({ key, label }) => (
          <CampoArchivo
            key={key}
            label={fotos[key] ? label : `${label} *`}
            icono="camara"
            accept="image/*"
            capture="environment"
            archivos={fotos[key] ? [fotos[key]] : []}
            textoVacio={label}
            onChange={(e) => onChange(key, e.target.files[0] ?? null)}
          />
        ))}
      </div>
    </div>
  )
}
