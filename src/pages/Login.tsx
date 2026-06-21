import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';
import './Login.css';

const LOGO = 'https://mercadodeandamios.com.mx/wp-content/uploads/2025/05/Diseno-sin-titulo-31.png';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setCargando(true);
    try {
      await login(usuario.trim(), password);
      navigate('/');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-split">
      {/* Panel de marca */}
      <div className="login-marca">
        <div className="login-marca-top">
          <img src={LOGO} alt="Mercado de Andamios" className="login-marca-logo" />
        </div>
        <div className="login-marca-centro">
          <span className="login-eyebrow">Cada hora cuenta</span>
          <h2 className="login-frase">Tu obra no espera.<br />Tu cotización tampoco.</h2>
          <p className="login-marca-sub">
            Genera, aprueba y envía cotizaciones de renta y venta de maquinaria
            en minutos.
          </p>
        </div>
        <div className="login-stats">
          <div><strong>+10</strong><span>años</span></div>
          <div><strong>4</strong><span>ciudades</span></div>
          <div><strong>+500</strong><span>obras</span></div>
        </div>
        <div className="hazard-strip login-marca-cinta" />
      </div>

      {/* Panel de formulario */}
      <div className="login-form-lado">
        <div className="login-form-box">
          <h1 className="login-titulo">Iniciar sesión</h1>
          <p className="login-sub">Sistema de cotizaciones · acceso interno</p>

          <form onSubmit={enviar} className="login-form">
            <div className="campo">
              <label htmlFor="usuario">Usuario</label>
              <input id="usuario" className="input" value={usuario}
                onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoFocus required />
            </div>
            <div className="campo">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" className="input" value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="btn btn-primario w-full" disabled={cargando} style={{ padding: 12 }}>
              {cargando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="login-pie">© {new Date().getFullYear()} Mercado de Andamios SA de CV</p>
        </div>
      </div>
    </div>
  );
}
