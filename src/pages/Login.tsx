import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setCargando(true);
    try { await login(email, password); navigate('/'); }
    catch (err) { setError(mensajeError(err)); }
    finally { setCargando(false); }
  };

  return (
    <div className="login">
      <div className="login-marca">
        <div className="login-marca-contenido">
          <img src="/logo.png" alt="Mercado de Andamios" className="login-logo" />
          <h1>Sistema de Cotizaciones</h1>
          <p>Renta y venta de andamios y equipo para construcción.</p>
        </div>
        <div className="hazard-strip login-hazard" />
      </div>
      <div className="login-form-lado">
        <form className="login-form" onSubmit={enviar}>
          <h2>Iniciar sesión</h2>
          <p className="texto-suave" style={{ marginBottom: 20 }}>Entra con tu correo y contraseña.</p>
          {error && <div className="aviso error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="campo" style={{ marginBottom: 14 }}>
            <label htmlFor="email">Correo</label>
            <input id="email" className="input" type="email" value={email} autoFocus
              onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@mercadoandamios.com" required />
          </div>
          <div className="campo" style={{ marginBottom: 22 }}>
            <label htmlFor="pass">Contraseña</label>
            <input id="pass" className="input" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn btn-primario btn-block" type="submit" disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
