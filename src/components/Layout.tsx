import { NavLink, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

interface ItemNav { to: string; etiqueta: string; icono: string; soloAdmin?: boolean; grupo?: string; }
const NAV: ItemNav[] = [
  { to: '/', etiqueta: 'Dashboard', icono: '◧' },
  { to: '/cotizaciones', etiqueta: 'Cotizaciones', icono: '▤' },
  { to: '/mis-cotizaciones', etiqueta: 'Mis cotizaciones', icono: '☆' },
  { to: '/clientes', etiqueta: 'Clientes', icono: '◎', grupo: 'Catálogos' },
  { to: '/incidencias', etiqueta: 'Incidencias', icono: '⚠', grupo: 'Catálogos' },
  { to: '/articulos-renta', etiqueta: 'Artículos de Renta', icono: '⬚', grupo: 'Catálogos' },
  { to: '/articulos-venta', etiqueta: 'Artículos de Venta', icono: '⬛', grupo: 'Catálogos' },
  { to: '/servicios', etiqueta: 'Servicios', icono: '⚙', grupo: 'Catálogos' },
  { to: '/unidades', etiqueta: 'Unidades', icono: '▣', grupo: 'Inventario' },
  { to: '/existencias', etiqueta: 'Existencias', icono: '▦', grupo: 'Inventario' },
  { to: '/usuarios', etiqueta: 'Usuarios', icono: '☖', soloAdmin: true, grupo: 'Administración' },
  { to: '/sucursales', etiqueta: 'Sucursales', icono: '⌂', soloAdmin: true, grupo: 'Administración' },
  { to: '/revision', etiqueta: 'Revisión de clientes', icono: '✎', soloAdmin: true, grupo: 'Administración' },
  { to: '/configuracion', etiqueta: 'Configuración', icono: '⚿', soloAdmin: true, grupo: 'Administración' },
];

export function Layout({ titulo, acciones, children }: { titulo: string; acciones?: ReactNode; children: ReactNode }) {
  const { usuario, esAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const salir = () => { logout(); navigate('/login'); };
  const iniciales = (usuario?.Nombre || 'U').split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();

  const visibles = NAV.filter((i) => !i.soloAdmin || esAdmin);
  const grupos = visibles.reduce<Record<string, ItemNav[]>>((acc, i) => {
    const g = i.grupo || '_'; (acc[g] ??= []).push(i); return acc;
  }, {});

  return (
    <div className="app">
      <aside className={`sidebar ${abierto ? 'abierto' : ''}`}>
        <div className="sidebar-marca">
          <img src="/logo.png" alt="Mercado de Andamios" className="sidebar-logo" />
        </div>
        <div className="hazard-strip" />
        <nav className="sidebar-nav">
          {Object.entries(grupos).map(([grupo, items]) => (
            <div key={grupo} className="nav-grupo">
              {grupo !== '_' && <span className="nav-grupo-lbl">{grupo}</span>}
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.to === '/'} onClick={() => setAbierto(false)}
                  className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}>
                  <span className="nav-icono" aria-hidden>{i.icono}</span>{i.etiqueta}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-pie">
          <div className="usuario-chip">
            <div className="avatar">{iniciales}</div>
            <div className="usuario-datos">
              <span className="usuario-nombre">{usuario?.Nombre}</span>
              <span className="usuario-rol">{usuario?.Rol}</span>
            </div>
          </div>
          <button className="btn btn-fantasma btn-sm salir" onClick={salir}>Salir</button>
        </div>
      </aside>
      {abierto && <div className="sidebar-overlay" onClick={() => setAbierto(false)} />}
      <div className="contenido">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setAbierto(true)} aria-label="Menú">☰</button>
          <h1 className="topbar-titulo">{titulo}</h1>
          <div className="topbar-acciones">{acciones}</div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
