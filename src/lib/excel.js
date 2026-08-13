import ExcelJS from 'exceljs'

const COLOR_ENCABEZADO = 'FF111827'
const COLOR_TEXTO_ENCABEZADO = 'FFFFFFFF'
const COLOR_ENLACE = 'FF2563EB'
export const ALTO_FILA_DATOS = 58

export function crearLibro() {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Rotaflota'
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
    const arrayBuffer = await res.arrayBuffer()
    // exceljs corre en el navegador, sin el global `Buffer` de Node — un
    // ArrayBuffer crudo no tiene `.length` (solo `.byteLength`) y hace que la
    // librería arme mal el .xlsx. Uint8Array sí es lo que espera.
    const extension = tipo.includes('png') ? 'png' : tipo.includes('gif') ? 'gif' : 'jpeg'
    return { buffer: new Uint8Array(arrayBuffer), extension }
  } catch {
    // Sin internet, URL vencida o bloqueo de CORS del bucket: no rompemos el
    // reporte, esa miniatura simplemente queda vacía (el hipervínculo de
    // respaldo sigue disponible en la celda).
    return null
  }
}

// Presupuesto compartido de imágenes a embeber en todo el reporte, para que
// un reporte con cientos de movimientos no se quede colgado descargando
// cientos de fotos — pasado el tope, esas filas solo quedan con el enlace.
export function crearPresupuestoImagenes(maximo = 150) {
  return { restantes: maximo }
}

// Celda de adjunto: hipervínculo real y clickeable (no texto plano a copiar),
// o "N/A" si no aplica. colIndex es 0-based (para que llame parejo con
// insertarMiniatura, que sí lo necesita 0-based para exceljs).
export function celdaAdjunto(hoja, fila, colIndex, url, etiqueta = 'Ver') {
  const celda = hoja.getCell(fila, colIndex + 1)
  if (!url) {
    celda.value = 'N/A'
    celda.alignment = { vertical: 'middle', horizontal: 'center' }
    celda.font = { color: { argb: 'FF9CA3AF' } }
    return
  }
  celda.value = { text: etiqueta, hyperlink: url }
  celda.font = { color: { argb: COLOR_ENLACE }, underline: true }
  celda.alignment = { vertical: 'middle' }
}

// Superpone una miniatura sobre una celda que ya tiene el hipervínculo de
// respaldo (celdaAdjunto) — si la descarga falla (red, CORS del bucket,
// etc.) el hipervínculo de texto queda visible tal cual, sin miniatura.
export async function insertarMiniatura(libro, hoja, fila, colIndex, url, presupuesto) {
  if (!url || presupuesto.restantes <= 0) return false
  const info = await obtenerBufferImagen(url)
  if (!info) return false
  try {
    const imageId = libro.addImage({ buffer: info.buffer, extension: info.extension })
    hoja.addImage(imageId, {
      tl: { col: colIndex, row: fila - 1 + 0.06 },
      ext: { width: 88, height: 54 },
      editAs: 'oneCell',
    })
    presupuesto.restantes--
    return true
  } catch {
    // Una imagen puntual con un formato raro o corrupto no debe tumbar todo
    // el reporte — esa miniatura queda vacía, el hipervínculo sigue ahí.
    return false
  }
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
