import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { crearRecursoApi } from '../api/recurso';

export interface OpcionSelect { valor: string | number; etiqueta: string; }

export interface CampoConfig {
  clave: string;
  etiqueta: string;
  tipo: 'texto' | 'numero' | 'select' | 'checkbox' | 'textarea' | 'fecha' | 'recurso';
  requerido?: boolean;
  soloForm?: boolean;    // aparece en el formulario, no en la tabla
  soloTabla?: boolean;   // aparece en la tabla, no en el formulario
  opciones?: OpcionSelect[];
  // Para tipo 'recurso': carga opciones desde un endpoint
  recurso?: string;
  recursoValor?: string;      // campo que va como value
  recursoEtiqueta?: string[]; // campos que forman la etiqueta visible
  ancho?: 'completo';
  placeholder?: string;
  ayuda?: string;
  formato?: (valor: unknown, fila: Record<string, unknown>) => ReactNode; // render en tabla
  ocultarEnForm?: (valores: Record<string, unknown>) => boolean;
}

export function Campo({ campo, valor, onCambio, opcionesRecurso }: {
  campo: CampoConfig; valor: unknown; onCambio: (v: unknown) => void;
  opcionesRecurso?: OpcionSelect[];
}) {
  const id = `campo-${campo.clave}`;
  const etiqueta = (
    <label htmlFor={id}>{campo.etiqueta}{campo.requerido && <span className="req"> *</span>}</label>
  );

  if (campo.tipo === 'checkbox') {
    return (
      <div className="campo" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input id={id} type="checkbox" checked={!!valor} onChange={(e) => onCambio(e.target.checked)}
          style={{ width: 18, height: 18 }} />
        <label htmlFor={id} style={{ margin: 0 }}>{campo.etiqueta}</label>
      </div>
    );
  }

  return (
    <div className="campo" style={campo.ancho === 'completo' ? { gridColumn: '1 / -1' } : undefined}>
      {etiqueta}
      {campo.tipo === 'textarea' ? (
        <textarea id={id} className="textarea" value={(valor as string) ?? ''}
          placeholder={campo.placeholder} onChange={(e) => onCambio(e.target.value)} />
      ) : campo.tipo === 'select' ? (
        <select id={id} className="select" value={(valor as string) ?? ''} onChange={(e) => onCambio(e.target.value)}>
          <option value="">— Selecciona —</option>
          {campo.opciones?.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
      ) : campo.tipo === 'recurso' ? (
        <select id={id} className="select" value={(valor as string) ?? ''}
          onChange={(e) => onCambio(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— Selecciona —</option>
          {opcionesRecurso?.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
      ) : (
        <input id={id} className="input" type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
          value={(valor as string | number) ?? ''} placeholder={campo.placeholder} step="any"
          onChange={(e) => onCambio(campo.tipo === 'numero'
            ? (e.target.value === '' ? null : Number(e.target.value))
            : e.target.value)} />
      )}
      {campo.ayuda && <span className="texto-suave" style={{ fontSize: 12 }}>{campo.ayuda}</span>}
    </div>
  );
}

/** Hook: carga las opciones de los campos tipo 'recurso'. */
export function useOpcionesRecurso(campos: CampoConfig[]) {
  const [mapa, setMapa] = useState<Record<string, OpcionSelect[]>>({});
  useEffect(() => {
    const recursos = campos.filter((c) => c.tipo === 'recurso' && c.recurso);
    if (!recursos.length) return;
    Promise.all(recursos.map(async (c) => {
      const api = crearRecursoApi(c.recurso!);
      const filas = await api.listar();
      const opciones: OpcionSelect[] = filas.map((f) => ({
        valor: f[c.recursoValor!],
        etiqueta: (c.recursoEtiqueta || []).map((k) => f[k]).filter(Boolean).join(' — '),
      }));
      return [c.clave, opciones] as const;
    })).then((pares) => setMapa(Object.fromEntries(pares)));
  }, [campos]);
  return mapa;
}
