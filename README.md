# EDKOR MOTORS - Sistema de Gestión de Taller

Sistema integral de gestión de taller mecánico para **EDKOR MOTORS**.

## Estructura del Proyecto

```
EDKOR/
├── edkor-backend/       # Servidor API REST con NestJS, TypeORM, PostgreSQL y Baileys (Chatbot)
│   ├── Dockerfile
│   ├── src/
│   └── package.json
├── edkor-frontend/      # Aplicación SPA cliente con React, Vite, TailwindCSS y Lucide
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   └── package.json
├── docker-compose.yml   # Orquestación con Docker Compose
└── README.md
```

---

## Despliegue en Producción con Coolify (Hostinger VPS KVM 2)

### Opción Recomendada: Despliegue por Servicios en Coolify

En Coolify, desde tu proyecto o entorno:

#### 1. Crear la Base de Datos (PostgreSQL)
1. Clic en **+ New Resource** -> **Database** -> **PostgreSQL**.
2. Asigna un nombre al servicio (ej. `edkor-postgres`).
3. Define o copia las credenciales:
   - `POSTGRES_USER`: `postgres`
   - `POSTGRES_PASSWORD`: (Tu contraseña segura)
   - `POSTGRES_DB`: `edkor`
4. Inicia la base de datos (**Start**).

#### 2. Desplegar el Backend (`edkor-backend`)
1. Clic en **+ New Resource** -> **Application** -> **Public Repository** o **GitHub App**.
2. Repositorio: `https://github.com/RaulCostas/edkor.git`
3. Rama: `main`
4. Configuración básica de la aplicación:
   - **Base Directory**: `/edkor-backend`
   - **Build Pack**: `Dockerfile`
   - **Ports Exposes**: `3001`
5. **Variables de Entorno (Environment Variables)**:
   ```env
   NODE_ENV=production
   PORT=3001
   DB_HOST=edkor-postgres (o el nombre interno de red del contenedor Postgres en Coolify)
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=(tu contraseña de postgres)
   DB_NAME=edkor

   # Credenciales de Gmail (Para recuperación de contraseña por correo)
   MAIL_USER=tu_correo@gmail.com
   MAIL_PASS=tu_contraseña_de_aplicacion_gmail_16_caracteres
   MAIL_FROM="EDKOR MOTORS" <tu_correo@gmail.com>
   ```
6. **Almacenamiento Persistente (Storage / Volumes)**:
   > ⚠️ **Muy Importante:** Agrega los volúmenes persistentes en Coolify para no perder la sesión de WhatsApp ni las fotos/archivos subidos entre reinicios o despliegues.
   - Destino 1: `/app/wa_auth_info` (Sesión del bot de WhatsApp)
   - Destino 2: `/app/uploads` (Imágenes y comprobantes subidos)
7. Asigna un dominio al backend (ej. `https://api.tudominio.com`).
8. Clic en **Deploy**.

#### 3. Desplegar el Frontend (`edkor-frontend`)
1. Clic en **+ New Resource** -> **Application** -> Mismo repositorio `https://github.com/RaulCostas/edkor.git`.
2. Rama: `main`
3. Configuración básica:
   - **Base Directory**: `/edkor-frontend`
   - **Build Pack**: `Dockerfile`
   - **Ports Exposes**: `80`
4. **Variables de Entorno de Construcción (Build Environment Variables)**:
   ```env
   VITE_API_URL=https://api.tudominio.com
   ```
5. Asigna tu dominio principal para el frontend (ej. `https://edkor.tudominio.com` o `https://tudominio.com`).
6. Clic en **Deploy**.

---

### Opción Alternativa: Despliegue con Docker Compose en Coolify
1. En Coolify: **+ New Resource** -> **Docker Compose**.
2. Conecta con el repositorio `https://github.com/RaulCostas/edkor.git` rama `main`.
3. Coolify detectará automáticamente `docker-compose.yml` en la raíz.
4. Llena las variables de entorno (`DB_PASSWORD`, `VITE_API_URL`, `MAIL_USER`, `MAIL_PASS`).
5. Asigna tus dominios a los servicios `frontend` y `backend`.
6. Clic en **Deploy**.

---

## Desarrollo Local

### Requisitos
- Node.js >= 20
- PostgreSQL >= 15

### Backend
```bash
cd edkor-backend
npm install
npm run start:dev
```

### Frontend
```bash
cd edkor-frontend
npm install
npm run dev
```
Accede en tu navegador a: `http://localhost:5173`
