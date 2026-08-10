import { useEffect, useState } from 'react'
import { suscribirClientesDeComercial, marcarDescarte, revertirDescarte } from '../features/clientes/clientesApi'
import { MOTIVOS_DESCARTE } from '../lib/motivosDescarte'
import { agruparClientesPorDia, formatoTituloDia } from '../lib/agruparClientesPorDia'
import { INPUT_SM } from '../lib/estilos'
import { useAuth } from '../context/AuthContext'
import Tarjeta from '../components/Tarjeta'
import Badge from '../components/Badge'
import Boton from '../components/Boton'
import Vacio from '../components/Vacio'

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

  const visibles = clientes.filter((c) => mostrarDescartados || c.efectivo)
  const grupos = agruparClientesPorDia(visibles)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Mis clientes</h1>
        <button onClick={() => setMostrarDescartados((v) => !v)} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
          {mostrarDescartados ? 'Ocultar descartados' : 'Ver descartados'}
        </button>
      </div>

      {grupos.length === 0 && <Vacio titulo="Todavía no tienes clientes registrados" />}

      {grupos.map((grupo) => (
        <div key={grupo.fecha.toISOString()} className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">{formatoTituloDia(grupo.fecha)}</p>
          <ul className="space-y-2">
            {grupo.clientes.map((c, i) => (
              <Tarjeta key={c.id} animar style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {c.tipo} {c.comercialSolicitado && '· te pidió específicamente'}
                    </p>
                  </div>
                  {c.efectivo ? (
                    <Badge color="emerald" dot>Efectivo</Badge>
                  ) : (
                    <Badge color="gray">Descartado: {c.motivoDescarte}</Badge>
                  )}
                </div>
                {!c.efectivo && (
                  <button onClick={() => revertirDescarte(c.id)} className="mt-2 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Fue un error, volver a marcar como efectivo
                  </button>
                )}
                {c.efectivo && (
                  <div className="mt-2">
                    {editando === c.id ? (
                      <div className="flex flex-wrap items-center gap-2 animate-slide-up">
                        <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={INPUT_SM}>
                          {MOTIVOS_DESCARTE.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <Boton variante="peligro" tamano="sm" onClick={() => handleDescartar(c.id)}>
                          Confirmar descarte
                        </Boton>
                        <Boton variante="fantasma" tamano="sm" onClick={() => setEditando(null)}>
                          Cancelar
                        </Boton>
                      </div>
                    ) : (
                      <button onClick={() => setEditando(c.id)} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                        Marcar como no efectivo
                      </button>
                    )}
                  </div>
                )}
              </Tarjeta>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
