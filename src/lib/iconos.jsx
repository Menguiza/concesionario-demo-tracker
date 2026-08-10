// Set de iconos de línea (estilo consistente: stroke, sin relleno) usado en
// la navegación, el dashboard y accesos rápidos, para que la iconografía se
// sienta de una sola pieza en vez de íconos sueltos por cada pantalla.

export function IconoInicio(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function IconoAdmin(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l7 3.2v4.3c0 4.6-3 8.6-7 10.5-4-1.9-7-5.9-7-10.5V6.2z" />
      <path d="M9 12.2l2.2 2.2L15.5 10" />
    </svg>
  )
}

export function IconoComerciales(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="8.5" r="2.3" />
      <path d="M15 11.7a4.6 4.6 0 0 1 5.5 4.5" />
    </svg>
  )
}

export function IconoVehiculos(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" {...props}>
      <path
        strokeLinecap="round"
        d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13M5 13h14v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-5z"
      />
      <circle cx="7.5" cy="16" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconoReservas(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8 3v3.5M16 3v3.5" />
      <circle cx="8.3" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconoCola(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 7h12M8 12h12M8 17h12" />
      <circle cx="4" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconoReloj(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function IconoLlave(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.5 12.5 18 5M16 7l2 2M18.5 4.5l2 2" />
    </svg>
  )
}

export function IconoFlechaDerecha(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
