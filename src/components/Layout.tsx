import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const LOGO = 'https://mercadodeandamios.com.mx/wp-content/uploads/2025/05/Diseno-sin-titulo-31.png';

const NAV = [
  { to: '/',             etiqueta: 'Dashboard',    icono: '◧' },
  { to: '/cotizaciones', etiqueta: 'Cotizaciones', icono: '▤' },
  { to: '/clientes',     etiqueta: 'Clientes',     icono: '◎' },
  { to: '/articulos',    etiqueta: 'Catálogo',     icono: '⬚' },
];

export function Layout({ titulo, acciones, children }: {
  titulo: string; acciones?: ReactNode; children: ReactNode;
}) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const salir = () => { logout(); navigate('/login'); };
  const iniciales = (usuario?.Nombre || 'U').split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-marca">
          <img src={LOGO} alt="Mercado de Andamios" className="sidebar-logo" />
        </div>
        <div className="hazard-strip" />
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}>
              <span className="nav-icono" aria-hidden>{item.icono}</span>
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-pie">
          <div className="usuario-chip">
            <div className="avatar">{iniciales}</div>
            <div className="usuario-datos">
              <span className="usuario-nombre">{usuario?.Nombre}</span>
              <span className="usuario-rol">@{usuario?.Usuario}</span>
            </div>
          </div>
          <button className="btn btn-fantasma btn-sm salir" onClick={salir}>Salir</button>
        </div>
      </aside>
      <div className="contenido">
        <header className="topbar">
          <h1 className="topbar-titulo">{titulo}</h1>
          <div className="topbar-acciones">{acciones}</div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
