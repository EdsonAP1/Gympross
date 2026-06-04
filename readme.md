# GymPross - Sistema de Gestión de Gimnasios SaaS

GymPross es una plataforma modular y multi-tenant diseñada para la administración y operación de gimnasios, con entornos independientes para el Frontend (React) y Backend (API REST en Flask) integrados con Supabase.

---

## 🛠️ Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu sistema antes de comenzar:
- **Node.js** (versión 18 o superior)
- **Python** (versión 3.10 o superior)
- **Git**

---

## 🚀 Guía de Instalación y Ejecución

### 1. Clonar el Repositorio
```bash
git clone <URL_DE_TU_REPOSITORIO_EN_GITHUB>
cd Gym+
```

---

### 2. Configurar el Backend (Flask)

1. Dirígete a la carpeta del backend:
   ```bash
   cd gympross-backend
   ```
2. Crea el entorno virtual de Python:
   ```bash
   python -m venv venv
   ```
3. Activa el entorno virtual:
   - **En Windows (CMD/PowerShell):**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **En macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```
4. Instala las dependencias:
   ```bash
   pip install -r requerimientos.txt
   ```
5. Crea un archivo `.env` en la carpeta `gympross-backend` y configura las variables de entorno de Supabase (ver sección **Integración con Supabase**):
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_KEY=tu-anon-key-de-supabase
   PORT=5000
   ```
6. Inicia el servidor backend:
   ```bash
   python ejecutar.py
   ```
   *El backend estará activo en: `http://localhost:5000`*

---

### 3. Configurar el Frontend (React + Vite)

1. En una nueva terminal, ve a la carpeta del frontend:
   ```bash
   cd gympross-frontend
   ```
2. Instala los paquetes de Node.js:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la carpeta `gympross-frontend` con los datos de tu Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```
4. Inicia el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```
   *El frontend estará disponible en: `http://localhost:5173`*

---

## ☁️ Integración con Supabase (Tu propio proyecto)

Si deseas conectar el proyecto a tu propio panel de Supabase de manera limpia, sigue estos pasos:

### 1. Inicializar el Esquema de Base de Datos
En tu panel de Supabase, ve al **SQL Editor**, crea una nueva consulta y ejecuta el siguiente script para crear las tablas, restricciones y habilitar las políticas de seguridad (RLS):

```sql
-- 1. Tabla de Gimnasios
CREATE TABLE public.gimnasios (
    id_gimnasio UUID PRIMARY KEY,
    nombre_gimnasio TEXT UNIQUE NOT NULL,
    estado_suscripcion TEXT CHECK (estado_suscripcion IN ('activo', 'suspendido')) DEFAULT 'activo',
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    cantidad_casilleros INTEGER DEFAULT 20,
    contrasena_dueno TEXT DEFAULT 'password123',
    contrasena_recepcion TEXT DEFAULT 'password123',
    promocion_nombre TEXT DEFAULT '',
    promocion_descuento NUMERIC DEFAULT 0,
    precio_mensual NUMERIC DEFAULT 30,
    precio_ejecutivo NUMERIC DEFAULT 20,
    precio_anual NUMERIC DEFAULT 250,
    moneda TEXT DEFAULT 'USD'
);

-- 2. Tabla de Personal
CREATE TABLE public.usuarios_personal (
    id_usuario UUID PRIMARY KEY,
    id_gimnasio UUID REFERENCES public.gimnasios(id_gimnasio) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    correo_electronico TEXT UNIQUE NOT NULL,
    rol_usuario TEXT CHECK (rol_usuario IN ('dueno', 'recepcionista', 'entrenador', 'limpieza')) NOT NULL,
    contrasena_inicial TEXT,
    pin_acceso TEXT
);

-- 3. Tabla de Clientes
CREATE TABLE public.clientes (
    id_cliente UUID PRIMARY KEY,
    id_gimnasio UUID REFERENCES public.gimnasios(id_gimnasio) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    documento_identidad TEXT NOT NULL,
    pin_acceso TEXT NOT NULL,
    estado_membresia TEXT CHECK (estado_membresia IN ('activa', 'vencida')) DEFAULT 'vencida',
    url_foto_perfil TEXT,
    casillero_asignado INTEGER,
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    UNIQUE(id_gimnasio, pin_acceso)
);

-- 4. Tabla de Asistencias
CREATE TABLE public.asistencias (
    id_asistencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_gimnasio UUID REFERENCES public.gimnasios(id_gimnasio) ON DELETE CASCADE,
    tipo_persona TEXT CHECK (tipo_persona IN ('cliente', 'personal')) NOT NULL,
    id_referencia UUID NOT NULL,
    fecha_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_salida TIMESTAMP WITH TIME ZONE,
    numero_llave INTEGER
);

-- 5. Tabla de Pagos
CREATE TABLE public.pagos_registro (
    id_pago UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_gimnasio UUID REFERENCES public.gimnasios(id_gimnasio) ON DELETE CASCADE,
    id_cliente UUID REFERENCES public.clientes(id_cliente) ON DELETE CASCADE,
    id_usuario UUID,
    monto NUMERIC NOT NULL,
    tipo_pago TEXT CHECK (tipo_pago IN ('efectivo', 'qr')) NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Configuraciones Globales
CREATE TABLE public.configuraciones_globales (
    id_configuracion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave TEXT UNIQUE,
    valor TEXT
);

-- Activar RLS en todas las tablas
ALTER TABLE public.gimnasios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuraciones_globales ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas de prueba (Acceso total para anon y authenticated)
CREATE POLICY "Permitir todo a anon" ON public.gimnasios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a auth" ON public.gimnasios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a anon" ON public.usuarios_personal FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a auth" ON public.usuarios_personal FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a anon" ON public.clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a auth" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a anon" ON public.asistencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a auth" ON public.asistencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a anon" ON public.pagos_registro FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a auth" ON public.pagos_registro FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir todo a anon" ON public.configuraciones_globales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a auth" ON public.configuraciones_globales FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 2. Poblar con Datos de Prueba (Semilla)
Una vez configurados tus archivos `.env` con las claves de tu nuevo proyecto, abre la terminal del backend con tu entorno virtual activo y ejecuta:
```bash
python semilla.py
```

### 3. Confirmar Correos en Supabase Auth
Por último, para evitar tener que verificar los correos de prueba generados, ejecuta esta última línea en el **SQL Editor** de Supabase:
```sql
UPDATE auth.users SET email_confirmed_at = NOW();
```

---

## 🔑 Credenciales de Prueba

| Rol | Correo Electrónico (Email) | Contraseña (Password) |
| :--- | :--- | :--- |
| **Superadministrador** | `superadmin@gympross.com` | `password123` |
| **Dueño** | `dueno@gympross.com` | `password123` |
| **Recepcionista** | `recepcion@gympross.com` | `password123` |
