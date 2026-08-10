import { useState } from 'react'
import { registrarMovimiento } from '../features/movimientos/movimientosApi'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { useAuth } from '../context/AuthContext'
import CampoArchivo from './CampoArchivo'

// Formulario reducido para comercial/directivo: solo adjuntos, porque el
// quién y el motivo ya viven en la reserva. Se usa tanto para el registro
// voluntario/obligatorio de entrega como para la devolución, y tanto desde
// Vehículos (con botón cancelar) como desde el bloqueo de pantalla completa
// (sin cancelar, onCancelar queda sin pasar).
export default function FormularioRegistroPropio({ vehiculo, tipo, reserva, onListo, onCancelar }) {
  const { firebaseUser, perfil, rol } = useAuth()
  const [esCliente, setEsCliente] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [fotos, setFotos] = useState([])
  const [video, setVideo] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (fotos.length === 0) {
      setError('Toma al menos una foto antes de guardar.')
      return
    }
    if (tipo === 'entrega' && esCliente && !documento) {
      setError('Cuando es un cliente, el documento firmado escaneado es obligatorio.')
      return
    }

    setEnviando(true)
    try {
      const yo = { tipo: rol, nombre: perfil?.nombre ?? '', uid: firebaseUser.uid }
      const cliente = { tipo: 'cliente', nombre: nombreCliente, uid: null }

      await registrarMovimiento({
        vehiculoId: vehiculo.id,
        tipo,
        quienRecibe: tipo === 'entrega' ? (esCliente ? cliente : yo) : yo,
        quienEntrega:
          tipo === 'entrega' ? { tipo: 'sistema', nombre: 'Registro por reserva' } : (vehiculo.quienTiene ?? yo),
        motivo: reserva?.motivo ?? null,
        fotos,
        video,
        documentoEscaneado: tipo === 'entrega' && esCliente ? documento : null,
        reservaId: reserva?.id ?? null,
      })
      onListo?.()
    } catch (err) {
      setError(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-medium text-gray-900">
        {tipo === 'entrega' ? `Vas a registrar la entrega de ${vehiculo.placa}` : `Vas a registrar la devolución de ${vehiculo.placa}`}
      </p>

      {tipo === 'entrega' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={esCliente} onChange={(e) => setEsCliente(e.target.checked)} />
          Es para un cliente
        </label>
      )}

      {tipo === 'entrega' && esCliente && (
        <input
          required
          placeholder="Nombre del cliente"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )}

      <CampoArchivo
        label="Fotos (obligatorio, varios ángulos + kilometraje)"
        icono="camara"
        accept="image/*"
        capture="environment"
        multiple
        archivos={fotos}
        textoVacio="Toca para tomar o elegir fotos"
        onChange={(e) => setFotos(Array.from(e.target.files))}
      />
      <CampoArchivo
        label="Video (opcional)"
        icono="video"
        accept="video/*"
        capture="environment"
        archivos={video ? [video] : []}
        textoVacio="Toca para grabar o elegir un video"
        onChange={(e) => setVideo(e.target.files[0] ?? null)}
      />
      {tipo === 'entrega' && esCliente && (
        <CampoArchivo
          label="Documento firmado escaneado (obligatorio con clientes)"
          icono="documento"
          accept="image/*,application/pdf"
          archivos={documento ? [documento] : []}
          textoVacio="Toca para adjuntar el documento"
          onChange={(e) => setDocumento(e.target.files[0] ?? null)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="rounded-lg bg-gray-900 text-white px-4 py-2 text-sm disabled:opacity-50">
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="text-sm text-gray-500">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
