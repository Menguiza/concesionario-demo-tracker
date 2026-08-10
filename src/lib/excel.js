import ExcelJS from 'exceljs'

const COLOR_ENCABEZADO = 'FF111827'
const COLOR_TEXTO_ENCABEZADO = 'FFFFFFFF'
const ALTO_FILA_CON_FOTOS = 62

export function crearLibro() {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Gestión de Vehículos y Comerciales'
  libro.created = new Date()
  return libro
}

// Hoja con encabezado con estilo de marca (fondo oscuro, texto blanco,
// negrita) y fila superior congelada, para que se sienta como un reporte
// real y no una tabla cruda.
export function agregarHojaTabular(libro, nombreHoja, columnas) {
  const hoja = libro.addWorksheet(nombreHoja.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] })
  hoja.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }))
  const filaEncabezado = hoja.getRow(1)
  filaEncabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: COLOR_TEXTO_ENCABEZADO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } }
    celda.alignment = { vertical: 'middle' }
  })
  filaEncabezado.height = 20
  return hoja
}

async function obtenerBufferImagen(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const tipo = res.headers.get('content-type') || ''
    if (!tipo.startsWith('image/')) return null // PDFs u otros: no se pueden embeber como imagen
    const buffer = await res.arrayBuffer()
    const extension = tipo.includes('png') ? 'png' : tipo.includes('gif') ? 'gif' : 'jpeg'
    return { buffer, extension }
  } catch {
    // Sin internet, URL vencida o bloqueo de CORS del bucket: no rompemos el
    // reporte, esa miniatura simplemente queda vacía (el enlace de texto
    // sigue disponible en la columna de enlaces).
    return null
  }
}

// Presupuesto compartido de imágenes a embeber en todo el reporte, para que
// un reporte con cientos de movimientos no se quede colgado descargando
// cientos de fotos — pasado el tope, esas filas solo quedan con el enlace.
export function crearPresupuestoImagenes(maximo = 150) {
  return { restantes: maximo }
}

// Inserta miniaturas en columnas consecutivas (0-based) de una fila (1-based).
// Devuelve cuántas logró insertar.
export async function insertarMiniaturas(libro, hoja, fila, colInicio, urls, presupuesto) {
  let insertadas = 0
  for (let i = 0; i < urls.length; i++) {
    if (presupuesto.restantes <= 0) break
    const info = await obtenerBufferImagen(urls[i])
    if (!info) continue
    presupuesto.restantes--
    const imageId = libro.addImage({ buffer: info.buffer, extension: info.extension })
    hoja.addImage(imageId, {
      tl: { col: colInicio + i, row: fila - 1 + 0.06 },
      ext: { width: 88, height: 54 },
      editAs: 'oneCell',
    })
    insertadas++
  }
  if (insertadas > 0) {
    hoja.getRow(fila).height = ALTO_FILA_CON_FOTOS
  }
  return insertadas
}

// Todas las URLs (fotos + video + documento) como texto plano, una por
// línea, para que nada se pierda aunque no haya podido embeberse como
// miniatura o el presupuesto de imágenes ya se haya agotado.
export function celdaEnlaces(hoja, fila, col, enlaces) {
  if (enlaces.length === 0) return
  const celda = hoja.getCell(fila, col)
  celda.value = enlaces.join('\n')
  celda.alignment = { wrapText: true, vertical: 'top' }
}

export async function descargarLibro(libro, nombreArchivo) {
  const buffer = await libro.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
