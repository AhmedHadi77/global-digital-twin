# Global Digital Twin Portfolio Case Study

## One-Line Summary

Global Digital Twin is a full-stack industrial monitoring platform that simulates connected devices, processes live telemetry, stores operational history, detects anomalies, and visualizes equipment state through a dashboard and 3D scene.

## Project Links

- Live App: [https://global-digital-twin-frontend.vercel.app](https://global-digital-twin-frontend.vercel.app)
- Backend Health: [https://global-digital-twin-backend.onrender.com/health](https://global-digital-twin-backend.onrender.com/health)
- GitHub: [https://github.com/AhmedHadi77/global-digital-twin](https://github.com/AhmedHadi77/global-digital-twin)

## Problem

Many portfolio dashboards look polished but do not model a real system behind the UI. I wanted to build a more realistic engineering project that demonstrates:

- real-time data flow
- backend state management
- persistent storage
- anomaly detection
- user-facing operational controls
- production deployment decisions under free-tier constraints

## Solution

I built a digital twin platform with:

- a Next.js frontend for dashboarding and device drilldowns
- a Node.js and Express backend for telemetry processing
- PostgreSQL for durable device and alert history
- Socket.IO for live updates
- a shared device model to keep services aligned
- an embedded simulator mode so the full product can stay hosted without a paid worker

## My Contribution

I designed and implemented the full system, including:

- frontend dashboard UX
- backend API and real-time event handling
- telemetry processing pipeline
- anomaly detection logic
- PostgreSQL schema and persistence
- deployment on Render and Vercel
- portfolio-ready product presentation

## Technical Highlights

### 1. Real-Time Monitoring

The platform receives ongoing telemetry for simulated devices and updates the dashboard with live device status, battery, temperature, vibration, and alerts.

### 2. Persistent Alert History

Instead of showing temporary in-memory warnings only, the backend stores alerts and device readings in PostgreSQL so device pages can show historical context.

### 3. Failure Injection

The dashboard supports control actions that intentionally trigger failure conditions. This makes the project interactive and shows how the system reacts to operational issues.

### 4. Free-Tier Deployment Workaround

Render background workers are not free, so I embedded the simulator inside the backend process. This kept the full system deployable at no extra cost while preserving the real-time product experience.

### 5. Reliability Improvement

Hosted free services can sleep, so I added HTTP polling fallback on the frontend in addition to Socket.IO. This improved the reliability of the deployed demo and reduced false "backend offline" states.

## Features Shown to Recruiters

- secure login flow for demo access
- live fleet summary dashboard
- device filtering and status views
- device details pages
- historical readings and alerts
- anomaly detection
- 3D digital twin visualization
- deployment across multiple hosted services

## Engineering Challenges I Solved

### Challenge: Shared Data Consistency

The simulator, backend, and frontend all needed to agree on device identity, thresholds, and behavior. I solved this by creating a shared device model and reusing it across services.

### Challenge: Paid Worker Limitation

The original simulator architecture required a separate long-running worker. Since that was not available on the free plan, I redesigned the system so the simulator could run inside the backend process.

### Challenge: Hosted Demo Reliability

Even with a healthy backend, the hosted frontend could appear offline due to connection timing and transport issues. I added HTTP polling fallback so the dashboard still loads data reliably when websockets are delayed.

## Business Value Framing

This project demonstrates how a digital twin platform can help operators:

- monitor asset status in one place
- detect abnormal behavior early
- investigate device-specific issues
- simulate incident scenarios safely
- make telemetry more understandable through visual and historical context

## Resume-Ready Impact Statements

- Built and deployed a full-stack digital twin platform using Next.js, Node.js, PostgreSQL, Socket.IO, and Three.js for real-time industrial monitoring.
- Designed a telemetry pipeline with persistent device snapshots, alert history, and anomaly detection for simulated connected devices.
- Solved free-tier deployment constraints by embedding the simulator into the backend and adding HTTP polling fallback for production reliability.
- Delivered interactive device drilldowns, failure injection controls, and a 3D operational view to demonstrate end-to-end product thinking.

## 30-Second Interview Pitch

I built a full-stack digital twin platform that simulates industrial devices and shows their real-time condition in a live dashboard. The system includes a Next.js frontend, a Node.js backend, PostgreSQL persistence, anomaly detection, alert history, and a 3D device view. One of the most interesting parts was redesigning the simulator to run inside the backend so I could keep the whole project hosted for free.

## 60-Second Interview Pitch

This project started as a dashboard idea, but I wanted it to behave like a real operational system instead of just a UI mockup. I built a digital twin platform where simulated devices stream temperature, vibration, battery, and status updates into a Node.js backend. The backend processes telemetry, stores device readings and alerts in PostgreSQL, and exposes REST and Socket.IO endpoints to a Next.js frontend. On the frontend, I added KPI cards, charts, device details pages, a 3D scene, and fault injection controls so users can trigger failures and see the system react. A big engineering challenge was deployment on free infrastructure, because Render does not provide free background workers. I solved that by embedding the simulator into the backend process and adding HTTP polling fallback so the deployed app stays reliable even when services wake from sleep.
