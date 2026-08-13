import { useState } from 'react'
import { registrarMovimiento } from '../features/movimientos/movimientosApi'
import { mensajeErrorAmigable } from '../lib/erroresFirebase'
import { fotosFaltantes } from '../lib/fotosVehiculo'
import { useAuth } from '../context/AuthContext'
import { INPUT } from '../lib/estilos'
import Boton from './Boton'
import Alerta from './Alerta'
import CampoArchivo from './CampoArchivo'
import FotosVehiculo from './FotosVehiculo'

// Formulario reducido para comercial/directivo: solo adjuntos, porque el
// quién y el motivo ya viven en la reserva. Se usa tanto para el registro
// voluntario/obligatorio de entrega como para la devolución, y tanto desde
// Vehículos (con botón cancelar) como desde el bloqueo de pantalla completa
// (sin cancelar, onCancelar queda sin pasar).
//
// ocultarToggleCliente llega en true cuando la reserva que disparó este
// registro ya nació "para cliente" (con un responsable asignado) — en ese
// caso no tiene sentido preguntar si es cliente, ya se sabe.
export default function FormularioRegistroPropio({ vehiculo, tipo, reserva, ocultarToggleCliente = false, onListo, onCancelar }) {
  const { firebaseUser, perfil, rol } = useAuth()
  const [esCliente, setEsCliente] = useState(ocultarToggleCliente)
  const [nombreCliente, setNombreCliente] = useState(ocultarToggleCliente ? reserva?.solicitadoPor?.nombre ?? '' : '')
  const [fotos, setFotos] = useState({})
  const [video, setVideo] = useState(null)
  const [documento, setDocumento] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function handleFotoChange(lado, archivo) {
    setFotos((prev) => ({ ...prev, [lado]: archivo }))
  }

  function datosEnvio() {
    const yo = { tipo: rol, nombre: perfil?.nombre ?? '', uid: firebaseUser.uid }
    const cliente = { tipo: 'cliente', nombre: nombreCliente, uid: null }
    return {
      yo,
      quienRecibe: tipo === 'entrega' ? (esCliente ? cliente : yo) : null,
      quienEntrega: tipo === 'entrega' ? null : yo,
      responsable: reserva?.responsable ?? yo,
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const faltantes = fotosFaltantes(fotos)
    if (faltantes.length > 0) {
      setError(`Faltan fotos: ${faltantes.map((f) => f.label).join(', ')}.`)
      return
    }
    if (tipo === 'entrega' && esCliente && !documento) {
      setError('Cuando es un cliente, el documento firmado escaneado es obligatorio.')
      return
    }

    setEnviando(true)
    try {
      const { quienRecibe, quienEntrega, responsable } = datosEnvio()

      // Este formulario es autogestionado: nadie del concesionario confirma
      // quién entregó (en una entrega) ni quién recibió (en una devolución)
      // porque no hay ningún campo que lo pregunte — dejarlo en null es lo
      // honesto, en vez de rellenarlo con un valor inventado.
      await registrarMovimiento({
        vehiculoId: vehiculo.id,
        tipo,
        quienRecibe,
        quienEntrega,
        motivo: reserva?.motivo ?? null,
        fotos,
        video,
        documentoEscaneado: tipo === 'entrega' && esCliente ? documento : null,
        reservaId: reserva?.id ?? null,
        responsable,
      })
      onListo?.()
    } catch (err) {
      setError(mensajeErrorAmigable(err))
    } finally {
      setEnviando(false)
    }
  }

  async function handleOmitir() {
    setError('')
    const confirmado = window.confirm(
      'Vas a recibir este vehículo sin dejar fotos ni documento. Eso significa que si después aparece una novedad (un golpe, un rayón), no vas a poder probar que no fue tuya — se asume que fue durante tu préstamo. ¿Aun así quieres omitir el registro?'
    )
    if (!confirmado) return

    setEnviando(true)
    try {
      const { quienRecibe, quienEntrega, responsable } = datosEnvio()
      await registrarMovimiento({
        vehiculoId: vehiculo.id,
        tipo,
        quienRecibe,
        quienEntrega,
        motivo: reserva?.motivo ?? null,
        fotos: {},
        video: null,
        documentoEscaneado: null,
        reservaId: reserva?.id ?? null,
        responsable,
        omitido: true,
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

      {tipo === 'entrega' && !ocultarToggleCliente && (
        <label className="flex items-center gap-2 text-sm text-gray-700 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={esCliente}
            onChange={(e) => setEsCliente(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500/15"
          />
          Es para un cliente
        </label>
      )}

      {tipo === 'entrega' && esCliente && ocultarToggleCliente && (
        <p className="text-sm text-gray-600">
          Cliente: <span className="font-medium text-gray-900">{nombreCliente}</span>
        </p>
      )}

      {tipo === 'entrega' && esCliente && !ocultarToggleCliente && (
        <input
          required
          placeholder="Nombre del cliente"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          className={`${INPUT} animate-slide-up`}
        />
      )}

      <FotosVehiculo fotos={fotos} onChange={handleFotoChange} />

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

      <Alerta tipo="error">{error}</Alerta>
      <div className="flex flex-wrap items-center gap-2">
        <Boton type="submit" cargando={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </Boton>
        {onCancelar && (
          <Boton type="button" variante="fantasma" onClick={onCancelar}>
            Cancelar
          </Boton>
        )}
        {tipo === 'entrega' && (
          <Boton type="button" variante="fantasma" disabled={enviando} onClick={handleOmitir} className="ml-auto text-xs">
            Omitir registro (sin fotos)
          </Boton>
        )}
      </div>
    </form>
  )
}
