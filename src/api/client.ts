import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !location.pathname.includes('/login')) {
      localStorage.removeItem('token'); localStorage.removeItem('usuario');
      location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error || error.message || 'Error de conexión';
  return 'Error inesperado';
}

/**
 * Código que manda el servidor en algunos errores (`CLIENTE_BLOQUEADO`,
 * `PIN_INCORRECTO`). Sirve para reaccionar sin leer el texto del mensaje.
 */
export function codigoError(error: unknown): string | null {
  if (axios.isAxiosError(error)) return error.response?.data?.codigo || null;
  return null;
}
export default api;
