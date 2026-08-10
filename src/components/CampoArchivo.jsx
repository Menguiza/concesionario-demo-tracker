import { useId } from 'react'

function IconoCamara() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.043 48.774 48.774 0 00-3.436 0 2.192 2.192 0 00-1.736 1.043l-.822 1.316z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function IconoVideo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  )
}

function IconoDocumento() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 shrink-0">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
      />
    </svg>
  )
}

const ICONOS = { camara: IconoCamara, video: IconoVideo, documento: IconoDocumento }

export default function CampoArchivo({ label, icono = 'documento', archivos, textoVacio, onChange, ...inputProps }) {
  const id = useId()
  const Icono = ICONOS[icono]

  const descripcion =
    archivos.length === 0
      ? textoVacio
      : archivos.length === 1
        ? archivos[0].name
        : `${archivos.length} archivos seleccionados`

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <label
        htmlFor={id}
        className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm cursor-pointer transition-colors ${
          archivos.length > 0
            ? 'border-gray-300 bg-gray-50 text-gray-700'
            : 'border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
        }`}
      >
        <Icono />
        <span className="truncate flex-1">{descripcion}</span>
        {archivos.length > 0 && (
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-600 shrink-0">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </label>
      <input id={id} type="file" onChange={onChange} className="hidden" {...inputProps} />
    </div>
  )
}
