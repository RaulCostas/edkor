export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  celular: string;
  estado: string;
}

export interface CreateSucursalData {
  nombre: string;
  direccion: string;
  celular: string;
  estado?: string;
}
