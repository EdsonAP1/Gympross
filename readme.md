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

