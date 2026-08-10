import { useEffect, useState } from 'react'
import { suscribirClientesDeComercial, marcarDescarte, revertirDescarte } from '../features/clientes/clientesApi'
import { MOTIVOS_DESCARTE } from '../lib/motivosDescarte'
import { useAuth } from '../context/AuthContext'

export default function ComercialPage() {
  const { firebaseUser } = useAuth()
  const [clientes, setClientes] = useState([])
  const [editando, setEditando] = useState(null)
  const [motivo, setMotivo] = useState(MOTIVOS_DESCARTE[0])
  const [mostrarDescartados, setMostrarDescartados] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    return suscribirClientesDeComercial(firebaseUser.uid, setClientes)
  }, [firebaseUser])

  async function handleDescartar(clienteId) {
    await marcarDescarte(clienteId, motivo)
    setEditando(null)
  }

  const ordenados = [...clientes]
    .filter((c) => mostrarDescartados || c.efectivo)
    .sort((a, b) => (b.fechaHora?.seconds ?? 0) - (a.fechaHora?.seconds ?? 0))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Mis clientes</h1>
        <button onClick={() => setMostrarDescartados((v) => !v)} className="text-xs text-gray-500 underline">
          {mostrarDescartados ? 'Ocultar descartados' : 'Ver descartados'}
        </button>
      </div>
      <ul className="space-y-2">
        {ordenados.map((c) => (
          <li key={c.id} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                <p className="text-xs text-gray-500">
                  {c.tipo} {c.comercialSolicitado && '· te pidió específicamente'}
                </p>
              </div>
              {c.efectivo ? (
                <span className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-3 py-1">Efectivo</span>
              ) : (
                <span className="text-xs rounded-full bg-gray-200 text-gray-600 px-3 py-1">Descartado: {c.motivoDescarte}</span>
              )}
            </div>
            {!c.efectivo && (
              <button onClick={() => revertirDescarte(c.id)} className="mt-2 text-sm text-gray-500 underline">
                Fue un error, volver a marcar como efectivo
              </button>
            )}
            {c.efectivo && (
              <div className="mt-2">
                {editando === c.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="text-sm rounded-lg border border-gray-300 px-2 py-1">
                      {MOTIVOS_DESCARTE.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => handleDescartar(c.id)} className="text-sm text-red-700 underline">
                      Confirmar descarte
                    </button>
                    <button onClick={() => setEditando(null)} className="text-sm text-gray-500">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditando(c.id)} className="text-sm text-gray-500 underline">
                    Marcar como no efectivo
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
