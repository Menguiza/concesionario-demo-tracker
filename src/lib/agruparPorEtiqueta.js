const TITULO_ROL = { directivo: 'Directivos', anfitriona: 'Anfitriona', admin: 'Admin' }

// Agrupa una lista de personas (comerciales, directivos, etc.) para mostrar
// en un <select> con <optgroup> — comerciales se agrupan por su PRIMERA
// etiqueta (si tiene varias, esa manda para la sección, para no complicar el
// dropdown); sin etiqueta cae en un grupo aparte. Roles no-comerciales no
// tienen etiquetas, así que se agrupan por rol.
export function agruparPersonasPorEtiqueta(personas, etiquetas) {
  const etiquetasPorId = Object.fromEntries(etiquetas.map((t) => [t.id, t]))
  const gruposNoComercial = new Map()
  const gruposTag = new Map()
  const sinEtiqueta = []

  for (const p of personas) {
    if (p.rol !== 'comercial') {
      const titulo = TITULO_ROL[p.rol] ?? p.rol
      if (!gruposNoComercial.has(titulo)) gruposNoComercial.set(titulo, [])
      gruposNoComercial.get(titulo).push(p)
      continue
    }
    const etiqueta = p.tags?.[0] ? etiquetasPorId[p.tags[0]] : null
    if (!etiqueta) {
      sinEtiqueta.push(p)
      continue
    }
    if (!gruposTag.has(etiqueta.id)) gruposTag.set(etiqueta.id, { titulo: etiqueta.nombre, personas: [] })
    gruposTag.get(etiqueta.id).personas.push(p)
  }

  const porNombre = (a, b) => a.nombre.localeCompare(b.nombre)
  const resultado = []
  for (const [titulo, integrantes] of gruposNoComercial) {
    resultado.push({ titulo, personas: [...integrantes].sort(porNombre) })
  }
  for (const grupo of [...gruposTag.values()].sort((a, b) => a.titulo.localeCompare(b.titulo))) {
    resultado.push({ titulo: grupo.titulo, personas: [...grupo.personas].sort(porNombre) })
  }
  if (sinEtiqueta.length > 0) {
    resultado.push({ titulo: 'Comerciales sin área asignada', personas: [...sinEtiqueta].sort(porNombre) })
  }
  return resultado
}
