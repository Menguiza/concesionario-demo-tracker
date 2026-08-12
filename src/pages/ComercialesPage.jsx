import { useEffect, useState } from 'react'
import { suscribirUsuarios, marcarLlegadaHoy, actualizarUsuario } from '../features/usuarios/usuariosApi'
import { suscribirClientesDeComercial, marcarDescarte, revertirDescarte } from '../features/clientes/clientesApi'
import { suscribirEtiquetas } from '../features/etiquetas/etiquetasApi'
import { MOTIVOS_DESCARTE } from '../lib/motivosDescarte'
import { agruparClientesPorDia, formatoTituloDia } from '../lib/agruparClientesPorDia'
import { fechaLocalYYYYMMDD } from '../lib/fechas'
import { coincideBusqueda } from '../lib/texto'
import { enlaceTel } from '../lib/telefono'
import { INPUT_SM } from '../lib/estilos'
import { useAuth } from '../context/AuthContext'
import Tarjeta from '../components/Tarjeta'
import Badge from '../components/Badge'
import Boton from '../components/Boton'
import Alerta from '../components/Alerta'
import Vacio from '../components/Vacio'
import BarraBusqueda from '../components/BarraBusqueda'
import EtiquetasChips from '../components/EtiquetasChips'

// Pastillas clicables (mismo patrón que la asignación de equipos en Admin)
// para prender/apagar la pertenencia de este comercial a cada etiqueta.
function EditorEtiquetasComercial({ comercial, etiquetas }) {
  async function toggleEtiqueta(etiquetaId) {
    const actuales = comercial.tags ?? []
    const nuevas = actuales.includes(etiquetaId) ? actuales.filter((id) => id !== etiquetaId) : [...actuales, etiquetaId]
    await actualizarUsuario(comercial.id, { tags: nuevas })
  }

  if (etiquetas.length === 0) {
    return <p className="text-xs text-gray-400">Todavía no hay etiquetas creadas (se crean desde Administración).</p>
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500">Etiquetas</p>
      <div className="flex flex-wrap gap-2">
        {etiquetas.map((t) => {
          const activa = (comercial.tags ?? []).includes(t.id)
          return (
            <label
              key={t.id}
              className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 cursor-pointer border transition-colors ${
                activa ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-600 border-transparent hover:border-gray-300'
              }`}
            >
              <input type="checkbox" checked={activa} onChange={() => toggleEtiqueta(t.id)} className="hidden" />
              {t.nombre}
            </label>
          )
        })}
      </div>
    </div>
  )
}

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
    <div className="space-y-3 animate-fade-in">
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
                    <Badge color="emerald" dot>Efectivo</Badge>
                  ) : (
                    <Badge color="gray">Descartado: {c.motivoDescarte}</Badge>
                  )}
                </div>

                {puedeGestionar && !c.efectivo && (
                  <button onClick={() => revertirDescarte(c.id)} className="mt-1 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Fue un error, volver a marcar como efectivo
                  </button>
                )}

                {puedeGestionar && c.efectivo && (
                  <div className="mt-1">
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
  const puedeAsignarTags = rol === 'admin' || rol === 'directivo'
  const [comerciales, setComerciales] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [expandidoId, setExpandidoId] = useState(null)
  const [editandoTagsId, setEditandoTagsId] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => suscribirUsuarios((todos) => setComerciales(todos.filter((u) => u.rol === 'comercial'))), [])
  useEffect(() => suscribirEtiquetas(setEtiquetas), [])

  const etiquetasPorId = Object.fromEntries(etiquetas.map((t) => [t.id, t]))
  // La búsqueda también matchea por nombre de etiqueta, para poder filtrar
  // rápido "quién es de Planta" sin tener que abrir cada tarjeta.
  const comercialesVisibles = comerciales.filter((c) => {
    const nombresTags = (c.tags ?? []).map((id) => etiquetasPorId[id]?.nombre).filter(Boolean).join(' ')
    return coincideBusqueda(`${c.nombre} ${nombresTags}`, busqueda)
  })

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-lg font-semibold text-gray-900">Comerciales</h1>
      {!puedeGestionar && (
        <Alerta tipo="info">
          Puedes ver el listado de clientes de cada comercial. Solo anfitriona y admin pueden marcar un cliente como no efectivo o su
          llegada.
        </Alerta>
      )}
      {comerciales.length === 0 && <Vacio titulo="Todavía no hay comerciales registrados" />}
      {comerciales.length > 0 && (
        <BarraBusqueda valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o etiqueta..." />
      )}
      {comerciales.length > 0 && comercialesVisibles.length === 0 && (
        <Vacio titulo="Sin resultados" descripcion={`Nada coincide con "${busqueda}".`} />
      )}
      <ul className="space-y-2">
        {comercialesVisibles.map((c, i) => {
          const llegadaHoy = c.ultimaLlegada?.fecha === fechaLocalYYYYMMDD() ? c.ultimaLlegada : null
          const expandido = expandidoId === c.id
          const editandoTags = editandoTagsId === c.id
          return (
            <Tarjeta key={c.id} animar style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => setExpandidoId(expandido ? null : c.id)}
                  className="flex items-center gap-1.5 text-left min-w-0"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${expandido ? 'rotate-90' : ''}`}
                  >
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm font-medium text-gray-900 truncate">{c.nombre}</span>
                </button>
                <Badge color={c.activo === false ? 'gray' : 'emerald'} className="shrink-0">
                  {c.activo === false ? 'Inactivo' : 'Activo'}
                </Badge>
              </div>

              {/* Etiquetas justo debajo del nombre, siempre visibles — no
                  hace falta expandir la tarjeta ni bajar hasta los clientes
                  para verlas o (admin/directivo) editarlas con el "+". */}
              <div className="pl-5 flex flex-wrap items-center gap-1.5">
                <EtiquetasChips tagIds={c.tags} etiquetasPorId={etiquetasPorId} />
                {puedeAsignarTags && (
                  <button
                    type="button"
                    onClick={() => setEditandoTagsId(editandoTags ? null : c.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${
                      editandoTags ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    aria-label={`Editar etiquetas de ${c.nombre}`}
                  >
                    {editandoTags ? '×' : '+'}
                  </button>
                )}
              </div>
              {editandoTags && (
                <div className="pl-5 animate-slide-up">
                  <EditorEtiquetasComercial comercial={c} etiquetas={etiquetas} />
                </div>
              )}

              {c.telefono && (
                <a
                  href={enlaceTel(c.telefono)}
                  className="pl-5 -mt-1 block text-xs text-gray-500 hover:text-gray-900 transition-colors w-fit"
                >
                  {c.telefono}
                </a>
              )}

              <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-gray-600">
                  {llegadaHoy
                    ? `Llegó hoy a las ${new Date(llegadaHoy.horaISO).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                    : 'No ha marcado llegada hoy'}
                </span>
                {!llegadaHoy && puedeGestionar && (
                  <Boton variante="secundario" tamano="sm" onClick={() => marcarLlegadaHoy(c.id)} className="shrink-0">
                    Marcar llegada
                  </Boton>
                )}
              </div>

              {expandido && (
                <div className="pl-4 animate-slide-up">
                  <ClientesDeComercial comercialId={c.id} puedeGestionar={puedeGestionar} />
                </div>
              )}
            </Tarjeta>
          )
        })}
      </ul>
    </div>
  )
}
