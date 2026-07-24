import api from './client';

export const adminApi = {
  async cambiarPin(pin: string) { await api.put('/admin/config/pin', { pin }); },
  async cambiarUmbral(umbral: number) { await api.put('/admin/config/umbral', { umbral }); },
  async umbral() { const { data } = await api.get('/admin/config/umbral'); return data.datos.umbral as number; },
  async contactos(idSucursal: number) {
    const { data } = await api.get(`/admin/sucursales/${idSucursal}/contactos`); return data.datos as any[];
  },
  async crearContacto(payload: unknown) { const { data } = await api.post('/admin/contactos', payload); return data.datos; },
  async eliminarContacto(id: number) { await api.delete(`/admin/contactos/${id}`); },
};
