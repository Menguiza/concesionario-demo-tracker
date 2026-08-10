import { useEffect, useState } from 'react'
import { suscribirUsuarios, marcarLlegadaHoy } from '../features/usuarios/usuariosApi'
import { suscribirClientesDeComercial, marcarDescarte, revertirDescarte } from '../features/clientes/clientesApi'
import { MOTIVOS_DESCARTE } from '../lib/motivosDescarte'
import { agruparClientesPorDia, formatoTituloDia } from '../lib/agruparClientesPorDia'
import { fechaLocalYYYYMMDD } from '../lib/fechas'
import { useAuth } from '../context/AuthContext'

function ClientesDeComercial({ comercialId, puedeGestionar }) {
  const [clientes, setClientes] = useState([])
  const [editando, setEditando] = useState(null)
  const [motivo, setMotivo] = useState(MOTIVOS_DESCARTE[0])

  useEffect(() => suscribirClientesDeComercial(comercialId, setClientes), [comercialId])

  const grupos = agruparClientesPorDia(clientes)

  async function handleDescartar(clienteId) {
    await marcarDescarte(clienteId, motivo)
    setEditando(null)
  }

  if (grupos.length === 0) {
    return <p className="text-xs text-gray-400 pl-1">Sin clientes registrados todavía.</p>
  }

  return (
    <div className="space-y-3">
      {grupos.map((grupo) => (
        <div key={grupo.fecha.toISOString()} className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">{formatoTituloDia(grupo.fecha)}</p>
          <ul className="space-y-2">
            {grupo.clientes.map((c) => (
              <li key={c.id} className="bg-gray-50 rounded-lg border border-gray-100 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {c.tipo}
                      {c.comercialSolicitado && ' · pidió específicamente'}
                    </p>
                  </div>
                  {c.efectivo ? (
                    <span className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 shrink-0">Efectivo</span>
                  ) : (
                    <span className="text-xs rounded-full bg-gray-200 text-gray-600 px-2 py-0.5 shrink-0">
                      Descartado: {c.motivoDescarte}
                    </span>
                  )}
                </div>

                {puedeGestionar && !c.efectivo && (
                  <button onClick={() => revertirDescarte(c.id)} className="mt-1 text-xs text-gray-500 underline">
                    Fue un error, volver a marcar como efectivo
                  </button>
                )}

                {puedeGestionar && c.efectivo && (
                  <div className="mt-1">
                    {editando === c.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          className="text-xs rounded-lg border border-gray-300 px-2 py-1"
                        >
                          {MOTIVOS_DESCARTE.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => handleDescartar(c.id)} className="text-xs text-red-700 underline">
                          Confirmar descarte
                        </button>
                        <button onClick={() => setEditando(null)} className="text-xs text-gray-500">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setEditando(c.id)} className="text-xs text-gray-500 underline">
                        Marcar como no efectivo
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function ComercialesPage() {
  const { rol } = useAuth()
  const puedeGestionar = rol === 'admin' || rol === 'anfitriona'
  const [comerciales, setComerciales] = useState([])
  const [expandidoId, setExpandidoId] = useState(null)

  useEffect(() => suscribirUsuarios((todos) => setComerciales(todos.filter((u) => u.rol === 'comercial'))), [])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">Comerciales</h1>
      {!puedeGestionar && (
        <p className="text-xs text-gray-500 bg-gray-100 rounded-lg p-3">
          Puedes ver el listado de clientes de cada comercial. Solo anfitriona y admin pueden marcar un cliente como no efectivo o su
          llegada.
        </p>
      )}
      {comerciales.length === 0 && <p className="text-sm text-gray-500">Todavía no hay comerciales registrados.</p>}
      <ul className="space-y-2">
        {comerciales.map((c) => {
          const llegadaHoy = c.ultimaLlegada?.fecha === fechaLocalYYYYMMDD() ? c.ultimaLlegada : null
          return (
            <li key={c.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
              <button
                onClick={() => setExpandidoId(expandidoId === c.id ? null : c.id)}
                className="flex items-center justify-between w-full text-left"
              >
                <p className="text-sm font-medium text-gray-900">
                  <span className="text-gray-400 mr-1">{expandidoId === c.id ? '▾' : '▸'}</span>
                  {c.nombre}
                </p>
                <span className="text-xs text-gray-500 shrink-0">{c.activo === false ? 'Inactivo' : 'Activo'}</span>
              </button>

              <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-600">
                  {llegadaHoy
                    ? `Llegó hoy a las ${new Date(llegadaHoy.horaISO).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                    : 'No ha marcado llegada hoy'}
                </span>
                {!llegadaHoy && puedeGestionar && (
                  <button
                    onClick={() => marcarLlegadaHoy(c.id)}
                    className="text-xs rounded-lg border border-gray-300 px-2 py-1 text-gray-700 shrink-0"
                  >
                    Marcar llegada
                  </button>
                )}
              </div>

              {expandidoId === c.id && (
                <div className="pl-4">
                  <ClientesDeComercial comercialId={c.id} puedeGestionar={puedeGestionar} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
