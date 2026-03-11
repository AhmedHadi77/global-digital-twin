# Global Digital Twin

A full-stack digital twin platform for monitoring simulated industrial devices in real time.

The project includes:
- a live frontend dashboard
- a backend API and Socket.IO server
- a device simulator
- persistent PostgreSQL storage for device state, readings, and alerts
- anomaly detection and alerting
- a 3D digital twin scene
- device details pages
- failure simulation controls
- demo authentication

## Features

- Shared device model across simulator, backend, and frontend
- Live device dashboard with KPI summary cards
- Search and filtering by device ID, status, and location
- Multi-device charts for temperature and battery
- Device detail pages at `/device/[deviceId]`
- Alert system for:
  - offline devices
  - overheating
  - low battery
  - anomaly detection
- Historical storage for:
  - current device state
  - device readings
  - alert history
- 3D digital twin visualization with device selection
- Failure simulation controls:
  - trigger offline
  - trigger overheat
  - trigger low battery
  - trigger temp spike
  - recover device
  - set random failure rate
- Demo login page and protected routes

## Project Structure

```text
global-digital-twin/
  backend/
  frontend/
  simulator/
  shared/
  README.md
