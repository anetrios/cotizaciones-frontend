import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useToast } from '../components/ui/Toast';
import { adminApi } from '../api/admin';
import { authApi } from '../api/auth';
import { mensajeError } from '../api/client';

export default function Configuracion() {
  const { mostrar } = useToast();

  // PIN de supervisor
  const [pin, setPin] = useState('');
  const [pinConfirma, setPinConfirma] = useState('');
  const [guardandoPin, setGuardandoPin] = useState(false);

  // Umbral de descuento
  const [umbral, setUmbral] = useState<number | ''>('');
  const [umbralActual, setUmbralActual] = useState<number | null>(null);
  const [guardandoUmbral, setGuardandoUmbral] = useState(false);

  // Contraseña propia
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [nuevaConfirma, setNuevaConfirma] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);

  useEffect(() => {
    adminApi.umbral()
      .then((u) => { setUmbralActual(u); setUmbral(u); })
      .catch((e) => mostrar(mensajeError(e), 'error'));
  }, [mostrar]);

  const guardarPin = async () => {
    if (!/^\d{4,8}$/.test(pin)) return mostrar('El PIN debe tener entre 4 y 8 dígitos', 'error');
    if (pin !== pinConfirma) return mostrar('Los PIN no coinciden', 'error');
    setGuardandoPin(true);
    try {
      await adminApi.cambiarPin(pin);
      mostrar('PIN de supervisor actualizado', 'exito');
      setPin(''); setPinConfirma('');
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardandoPin(false); }
  };

  const guardarUmbral = async () => {
    const v = Number(umbral);
    if (!Number.isFinite(v) || v < 0 || v > 100) return mostrar('El umbral debe estar entre 0 y 100', 'error');
    setGuardandoUmbral(true);
    try {
      await adminApi.cambiarUmbral(v);
      setUmbralActual(v);
      mostrar('Umbral actualizado', 'exito');
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardandoUmbral(false); }
  };

  const guardarPassword = async () => {
    if (nueva.length < 6) return mostrar('La nueva contraseña debe tener al menos 6 caracteres', 'error');
    if (nueva !== nuevaConfirma) return mostrar('Las contraseñas no coinciden', 'error');
    setGuardandoPass(true);
    try {
      await authApi.cambiarPassword(actual, nueva);
      mostrar('Contraseña actualizada', 'exito');
      setActual(''); setNueva(''); setNuevaConfirma('');
    } catch (e) { mostrar(mensajeError(e), 'error'); }
    finally { setGuardandoPass(false); }
  };

  return (
    <Layout titulo="Configuración">
      <div className="grid-2">
        {/* PIN de supervisor */}
        <div className="card card-cuerpo">
          <h3 className="doc-titulo">PIN de supervisor</h3>
          <p className="texto-suave" style={{ marginBottom: 16 }}>
            Se solicita al capturar un descuento mayor al umbral configurado. Se guarda cifrado;
            nadie —ni el administrador— puede verlo de nuevo, solo reemplazarlo.
          </p>
          <div className="campo">
            <label htmlFor="pin">Nuevo PIN</label>
            <input id="pin" className="input" type="password" inputMode="numeric" autoComplete="new-password"
              placeholder="4 a 8 dígitos" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="campo">
            <label htmlFor="pin2">Confirmar PIN</label>
            <input id="pin2" className="input" type="password" inputMode="numeric" autoComplete="new-password"
              value={pinConfirma} onChange={(e) => setPinConfirma(e.target.value.replace(/\D/g, ''))} />
          </div>
          <button className="btn btn-primario mt-8" onClick={guardarPin} disabled={guardandoPin}>
            {guardandoPin ? 'Guardando…' : 'Actualizar PIN'}
          </button>
        </div>

        {/* Umbral */}
        <div className="card card-cuerpo">
          <h3 className="doc-titulo">Umbral de descuento</h3>
          <p className="texto-suave" style={{ marginBottom: 16 }}>
            Porcentaje a partir del cual una cotización exige el PIN de supervisor.
            {umbralActual != null && <> Actualmente: <strong>{umbralActual}%</strong>.</>}
          </p>
          <div className="campo">
            <label htmlFor="umbral">Umbral (%)</label>
            <input id="umbral" className="input" type="number" min={0} max={100} step={1}
              value={umbral} onChange={(e) => setUmbral(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <button className="btn btn-primario mt-8" onClick={guardarUmbral} disabled={guardandoUmbral}>
            {guardandoUmbral ? 'Guardando…' : 'Actualizar umbral'}
          </button>
        </div>

        {/* Contraseña */}
        <div className="card card-cuerpo" style={{ gridColumn: '1 / -1' }}>
          <h3 className="doc-titulo">Mi contraseña</h3>
          <div className="grid-3">
            <div className="campo">
              <label htmlFor="pa">Contraseña actual</label>
              <input id="pa" className="input" type="password" autoComplete="current-password"
                value={actual} onChange={(e) => setActual(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="pn">Nueva contraseña</label>
              <input id="pn" className="input" type="password" autoComplete="new-password"
                value={nueva} onChange={(e) => setNueva(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="pn2">Confirmar nueva</label>
              <input id="pn2" className="input" type="password" autoComplete="new-password"
                value={nuevaConfirma} onChange={(e) => setNuevaConfirma(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primario mt-8" onClick={guardarPassword} disabled={guardandoPass}>
            {guardandoPass ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
