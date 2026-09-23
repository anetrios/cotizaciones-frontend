import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Spinner, Vacio, moneda, fecha as fechaCorta, hoyISO } from '../components/ui/UI';
import { Paginador } from '../components/ui/Paginador';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { ModalDesbloqueo } from '../components/ModalDesbloqueo';
import { ModalCliente } from '../components/ModalCliente';
import { ModalIncidencia } from '../components/ModalIncidencia';
import { clientesApi } from '../api/clientes';
import { mensajeError } from '../api/client';
import { ETIQUETA_INCIDENCIA } from '../types';
import type { Cliente, Incidencia, TipoIncidencia } from '../types';

const POR_PAGINA = 50;

/** Incidencias pendientes de todos los clientes: la pantalla de quien cobra. */
export default function Incidencias() {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { esAdmin, puedeEscribir } = useAuth();

  const [filas, setFilas] = useState<Incidencia[]>([]);
  const [total, setTotal] = useState(0);
  const [adeudo, setAdeudo] = useState(0);
  const [pagina, setPagina] = useState(1);
  // `busqueda` es lo que se ve escrito; `busquedaDiferida` es lo que se consulta.
  // Solo el texto espera: cambiar de página o de tipo pide de inmediato, porque
  // ahí no hay nada que esperar y 300 ms de retraso en un clic se sienten.
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDiferida, setBusquedaDiferida] = useState('');
  const [tipo, setTipo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [desbloqueo, setDesbloqueo] = useState<{ IdCliente: number; RazonSocial: string } | null>(null);
  // Alta desde aquí: primero se elige a quién, luego se captura. Quien cobra se
  // entera del adeudo en esta pantalla, no en la ficha del cliente.
  const [eligiendoCliente, setEligiendoCliente] = useState(false);
  const [clienteNuevaIncidencia, setClienteNuevaIncidencia] = useState<Cliente | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await clientesApi.incidenciasPendientes({
        busqueda: busquedaDiferida, tipo, pagina, porPagina: POR_PAGINA,
      });
      setFilas(r.datos); setTotal(r.total); setAdeudo(r.adeudo);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setCargando(false); }
  }, [busquedaDiferida, tipo, pagina, mostrar]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDiferida(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  /* Cualquier filtro nuevo devuelve a la página 1: filtrar y quedarse en la 7 deja
     la pantalla en blanco sin explicar por qué. Se hace aquí y no en un efecto
     para no disparar dos consultas, una con la página vieja y otra con la nueva. */
  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPagina(1); };
  const cambiarTipo = (v: string) => { setTipo(v); setPagina(1); };

  const resolver = async (i: Incidencia) => {
    if (!confirm(`¿Marcar como resuelta la incidencia de ${i.Cliente}?`)) return;
    try {
      const r = await clientesApi.resolverIncidencia(i.IdIncidencia);
      mostrar('Incidencia resuelta', 'exito');
      await cargar();
      if (r.puedeDesbloquearse && r.cliente) setDesbloqueo(r.cliente);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
  };

  /** Exporta TODO lo filtrado, no solo la página en pantalla. */
  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { datos } = await clientesApi.incidenciasPendientes({
        busqueda: busquedaDiferida, tipo, pagina: 1, porPagina: 100000,
      });
      const XLSX = await import('xlsx');
      const hoja = XLSX.utils.json_to_sheet(datos.map((i) => ({
        Cliente: i.Cliente,
        Teléfono: i.ClienteTelefono || '',
        Bloqueado: i.Restriccion === 'BLOQUEO' ? 'Sí' : '',
        Fecha: fechaCorta(i.Fecha),
        Tipo: ETIQUETA_INCIDENCIA[i.Tipo],
        Descripción: i.Descripcion,
        Monto: i.Monto ?? '',
      })));
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, 'Incidencias');
      const hoy = hoyISO();
      XLSX.writeFile(libro, `incidencias_${hoy}.xlsx`);
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setExportando(false); }
  };

  // Se mira lo ya aplicado, no lo que se está tecleando: el rótulo describe el
  // número de arriba, y ese número todavía es el de antes durante esos 300 ms.
  const filtrado = busquedaDiferida.trim() !== '' || tipo !== '';

  return (
    <Layout titulo="Incidencias" acciones={
      <div className="flex gap-8 wrap">
        <button className="btn btn-secundario" onClick={exportarExcel} disabled={exportando || total === 0}>
          {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </button>
        {puedeEscribir && (
          <button className="btn btn-primario" onClick={() => setEligiendoCliente(true)}>
            + Registrar incidencia
          </button>
        )}
      </div>
    }>
      <div className="card card-cuerpo" style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-center wrap gap-12">
          <div>
            <div className="doc-dato-lbl">
              Adeudo total de clientes morosos{filtrado ? ' (según el filtro)' : ''}
            </div>
            <strong style={{ fontSize: 22, color: 'var(--error)' }}>{moneda(adeudo)}</strong>
          </div>
          <span className="texto-medio">
            {total} incidencia{total === 1 ? '' : 's'} sin resolver
          </span>
        </div>
        <div className="texto-suave mt-8" style={{ fontSize: 12 }}>
          Suma solo las incidencias que traen monto capturado; las que vienen de la migración
          no siempre lo tienen.
        </div>
      </div>

      <div className="flex gap-12 wrap" style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 320 }}
          placeholder="Buscar cliente o descripción…"
          value={busqueda} onChange={(e) => cambiarBusqueda(e.target.value)} />
        <select className="select" style={{ maxWidth: 240 }} value={tipo}
          onChange={(e) => cambiarTipo(e.target.value)} aria-label="Tipo de incidencia">
          <option value="">Todos los tipos</option>
          {(Object.keys(ETIQUETA_INCIDENCIA) as TipoIncidencia[]).map((t) => (
            <option key={t} value={t}>{ETIQUETA_INCIDENCIA[t]}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {cargando ? <Spinner /> : filas.length === 0 ? (
          <Vacio titulo={filtrado ? 'Sin resultados' : 'Nada pendiente'}>
            {filtrado
              ? 'Ninguna incidencia coincide con lo que buscas. Prueba con otro texto o quita el filtro de tipo.'
              : 'No hay incidencias sin resolver.'}
          </Vacio>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cliente</th><th>Fecha</th><th>Tipo</th><th>Descripción</th>
                  <th className="der">Monto</th>
                  <th className="acciones-col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((i) => (
                  <tr key={i.IdIncidencia}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{i.Cliente}</span>
                      {i.Restriccion === 'BLOQUEO' && <span className="chip bad" style={{ marginLeft: 8 }}>Bloqueado</span>}
                      {i.ClienteTelefono && <div className="texto-suave num" style={{ fontSize: 12 }}>{i.ClienteTelefono}</div>}
                    </td>
                    <td className="num">{fechaCorta(i.Fecha)}</td>
                    <td><span className="chip bad">{ETIQUETA_INCIDENCIA[i.Tipo]}</span></td>
                    <td>{i.Descripcion}</td>
                    <td className="der num">{i.Monto != null ? moneda(i.Monto) : <span className="texto-suave">—</span>}</td>
                    <td className="acciones-col">
                      <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secundario btn-sm"
                          onClick={() => navigate(`/clientes/${i.IdCliente}`)}>Ver ficha</button>
                        {esAdmin && (
                          <button className="btn btn-secundario btn-sm"
                            onClick={() => resolver(i)}>Marcar resuelta</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Paginador pagina={pagina} total={total} porPagina={POR_PAGINA} onCambiar={setPagina} />

      {!esAdmin && (
        <p className="texto-suave mt-8" style={{ fontSize: 13 }}>
          Solo un administrador puede marcar incidencias como resueltas.
        </p>
      )}

      {eligiendoCliente && (
        <ModalCliente titulo="¿A qué cliente?"
          onCerrar={() => setEligiendoCliente(false)}
          onElegir={(c) => { setClienteNuevaIncidencia(c); setEligiendoCliente(false); }} />
      )}

      {clienteNuevaIncidencia && (
        <ModalIncidencia
          idCliente={clienteNuevaIncidencia.IdCliente}
          cliente={clienteNuevaIncidencia.RazonSocial}
          onCerrar={() => setClienteNuevaIncidencia(null)}
          onGuardado={() => { setClienteNuevaIncidencia(null); cargar(); }} />
      )}

      {desbloqueo && (
        <ModalDesbloqueo idCliente={desbloqueo.IdCliente} cliente={desbloqueo.RazonSocial}
          onCerrar={() => setDesbloqueo(null)}
          onDesbloqueado={() => { setDesbloqueo(null); cargar(); }} />
      )}
    </Layout>
  );
}
