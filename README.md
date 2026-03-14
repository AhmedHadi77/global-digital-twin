# Global Digital Twin

A production-style digital twin platform for monitoring simulated industrial devices in real time.

This project combines a live dashboard, a real-time backend, PostgreSQL persistence, anomaly detection, and an interactive 3D device view to demonstrate how industrial telemetry can be collected, processed, visualized, and controlled through one full-stack system.

## Live Demo

- Live App: [https://global-digital-twin-frontend.vercel.app](https://global-digital-twin-frontend.vercel.app)
- Backend Health: [https://global-digital-twin-backend.onrender.com/health](https://global-digital-twin-backend.onrender.com/health)
- Repository: [https://github.com/AhmedHadi77/global-digital-twin](https://github.com/AhmedHadi77/global-digital-twin)

Demo login:

- Email: `admin@zenith.local`
- Password: `admin123`

Note: the backend is hosted on Render free tier, so the first request may take a short time while the service wakes up.

## Why I Built This

Industrial dashboards are often shown as static mockups. I wanted to build a working end-to-end system that behaves more like a real digital twin platform:

- multiple devices streaming telemetry
- persistent historical readings and alerts
- anomaly detection and fault simulation
- a protected dashboard with device-level drilldowns
- a 3D visual layer for operational monitoring

## Key Features

- Real-time telemetry pipeline for 8 simulated industrial devices
- Embedded simulator mode for free hosting without a separate worker
- PostgreSQL persistence for device state, readings, and alerts
- KPI cards for fleet health, online/offline count, alerts, and anomalies
- Device details pages with recent readings and alert history
- Interactive 3D digital twin scene built with Three.js and React Three Fiber
- Fault injection controls:
  - trigger offline
  - trigger overheating
  - trigger low battery
  - trigger temperature spike
  - recover device
  - set random failure rate
- Demo authentication with protected frontend routes
- HTTP polling fallback plus Socket.IO updates for more reliable hosted demos

## Architecture

```text
Next.js Frontend (Vercel)
        |
        | REST + Socket.IO
        v
Node.js / Express Backend (Render)
        |
        | PostgreSQL
        v
Render Postgres
```

System flow:

1. Simulated devices generate temperature, vibration, battery, and status updates.
2. The backend processes telemetry, detects anomalies, and updates live device state.
3. Device snapshots, readings, and alerts are stored in PostgreSQL.
4. The frontend reads summary, device, and alert data over HTTP and receives live updates through Socket.IO.
5. Operators can open a device page, inspect history, and trigger failure scenarios from the dashboard.

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- Socket.IO Client
- Three.js
- `@react-three/fiber`
- `@react-three/drei`

### Backend

- Node.js
- Express
- Socket.IO
- PostgreSQL (`pg`)
- dotenv
- cors

### Simulation

- Node.js
- shared device model
- embedded simulation support for low-cost deployment

## Project Structure

```text
global-digital-twin/
  backend/
  frontend/
  shared/
  simulator/
  database.sql
  README.md
```

## Core Modules

### Frontend

- Dashboard with filters, KPIs, charts, alerts, controls, and 3D scene
- Login page with demo auth flow
- Dynamic device details pages at `/device/[deviceId]`
- Proxy-based route protection for authenticated screens

### Backend

- Device state engine
- Alert lifecycle management
- Anomaly detection
- REST API + Socket.IO transport
- PostgreSQL persistence
- Embedded simulator mode for free hosting

### Shared Layer

- Central device model and thresholds used by multiple services

## API Endpoints

- `GET /health`
- `GET /summary`
- `GET /devices`
- `GET /alerts`
- `GET /devices/:deviceId/details`
- `POST /simulate`

## Database Tables

- `devices`
- `device_readings`
- `alerts`

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/AhmedHadi77/global-digital-twin.git
cd global-digital-twin
```

### 2. Configure environment variables

Create:

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.local.example`

Example:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=global_digital_twin
DB_PASSWORD=your_password
DB_PORT=5432
DB_SSL=false
PORT=5000
FRONTEND_URLS=http://localhost:3000
RUN_EMBEDDED_SIMULATOR=false
```

Frontend example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### 3. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

Simulator:

```bash
cd simulator
npm install
```

### 4. Create the database schema

Run:

```bash
database.sql
```

against your PostgreSQL database.

### 5. Start the app locally

Terminal 1:

```bash
cd backend
npm start
```

Terminal 2:

```bash
cd simulator
npm start
```

Terminal 3:

```bash
cd frontend
npm run dev
```

Open:

- [http://localhost:3000/login](http://localhost:3000/login)

If you want to run the simulator from inside the backend instead, set:

```env
RUN_EMBEDDED_SIMULATOR=true
```

and only run the backend + frontend.

## Deployment

### Frontend

- Hosted on Vercel

### Backend

- Hosted on Render Web Service

### Database

- Hosted on Render Postgres

### Hosting Note

To keep the project deployable on free services, the simulator can run inside the backend process through `RUN_EMBEDDED_SIMULATOR=true`.

## Portfolio Highlights

- Designed a full-stack monitoring system instead of a static UI demo
- Solved free-tier hosting limitations by embedding the simulator into the backend
- Added HTTP polling fallback to improve reliability when hosted services sleep or websocket connections are delayed
- Built a reusable shared device model to keep simulator, backend, and frontend aligned
- Delivered both fleet-level and device-level monitoring experiences

## Roadmap

- Role-based authentication
- Alert acknowledgement workflow
- Historical analytics pages
- Docker-based local orchestration
- Automated tests for backend routes and simulation logic
- More advanced anomaly scoring and trend detection

## Author

Ahmed Hadi

If you are reviewing this project for hiring or collaboration, the best starting points are the live demo, the backend health endpoint, and the device details workflow.
