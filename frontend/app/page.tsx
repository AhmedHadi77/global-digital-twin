"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  Building2,
  Cpu,
  Gauge,
  Search,
  ShieldAlert,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DigitalTwinScene from "@/components/DigitalTwinScene";
import model from "@/lib/deviceModel";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const statusOptions = ["All", ...model.statusOptions];
const locationOptions = ["All", ...model.locationOptions];
const controlActions = model.controlActions;

interface SimulationState {
  forceOffline: boolean;
  forceOverheat: boolean;
  forceLowBattery: boolean;
  forceTempSpike: boolean;
}

interface Device {
  deviceId: string;
  name: string;
  deviceType: string;
  location: string;
  status: "Online" | "Offline";
  healthStatus: "OPERATIONAL" | "WARNING" | "CRITICAL";
  anomalyState: "STABLE" | "ANOMALY";
  anomalyReason: string | null;
  anomalyScore: number;
  temperature: number;
  vibration: number;
  batteryLevel: number;
  activeAlerts: number;
  simulationState: SimulationState;
  lastUpdate: string | null;
}

interface AlertItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  deviceId: string;
  deviceName: string;
  location: string;
  status: string;
  triggeredAt: string;
  updatedAt: string;
}

interface Summary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  criticalDevices: number;
  activeAlerts: number;
  anomaliesDetectedToday: number;
  randomFailureRate: number;
}

interface ChartPoint {
  time: string;
  [key: string]: string | number | null;
}

let socket: Socket | null = null;

const chartColors = ["#22d3ee", "#f59e0b", "#34d399", "#f97316", "#a78bfa", "#fb7185"];

function statusClasses(status: Device["status"]) {
  return status === "Online"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-rose-400/30 bg-rose-400/10 text-rose-200";
}

function healthClasses(status: Device["healthStatus"]) {
  if (status === "CRITICAL") return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  if (status === "WARNING") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
}

function anomalyClasses(state: Device["anomalyState"]) {
  return state === "ANOMALY"
    ? "border-orange-400/30 bg-orange-400/10 text-orange-100"
    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    criticalDevices: 0,
    activeAlerts: 0,
    anomaliesDetectedToday: 0,
    randomFailureRate: 0.08,
  });
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [controlDeviceId, setControlDeviceId] = useState("");
  const [randomFailureRateInput, setRandomFailureRateInput] = useState(8);
  const [connected, setConnected] = useState(false);
  const [controlMessage, setControlMessage] = useState("");
  const [controlBusy, setControlBusy] = useState(false);

  async function refreshSummary() {
    const response = await fetch(`${API_BASE}/summary`, { cache: "no-store" });
    const data = await response.json();
    setSummary(data);
    setRandomFailureRateInput(Math.round(data.randomFailureRate * 100));
  }

  useEffect(() => {
    refreshSummary().catch(() => {});

    socket = io(API_BASE, {
      transports: ["websocket"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("update_ui", (data: Device[]) => {
      setDevices(data);

      const nextPoint: ChartPoint = {
        time: new Date().toLocaleTimeString(),
      };

      data.forEach((device) => {
        nextPoint[`${device.deviceId}_temperature`] = device.temperature;
        nextPoint[`${device.deviceId}_battery`] = device.batteryLevel;
      });

      setHistory((prev) => [...prev.slice(-23), nextPoint]);

      if (!selectedDeviceId && data.length > 0) {
        setSelectedDeviceId(data[0].deviceId);
      }

      if (!controlDeviceId && data.length > 0) {
        setControlDeviceId(data[0].deviceId);
      }
    });

    socket.on("alerts_update", (data: AlertItem[]) => {
      setAlerts(data);
    });

    const interval = setInterval(() => {
      refreshSummary().catch(() => {});
    }, 10000);

    return () => {
      clearInterval(interval);
      socket?.disconnect();
      socket = null;
    };
  }, [selectedDeviceId, controlDeviceId]);

  const filteredDevices = devices.filter((device) => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      query.length === 0 ||
      device.deviceId.toLowerCase().includes(query) ||
      device.name.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" || device.status === statusFilter;

    const matchesLocation =
      locationFilter === "All" || device.location === locationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const chartDevices = filteredDevices.slice(0, 4);
  const visibleDeviceIds = new Set(filteredDevices.map((device) => device.deviceId));
  const visibleAlerts = alerts.filter((alert) => visibleDeviceIds.has(alert.deviceId));
  const selectedDevice =
    filteredDevices.find((device) => device.deviceId === selectedDeviceId) ??
    filteredDevices[0] ??
    null;

  async function triggerControl(action: string, value?: number) {
    if (!controlDeviceId && action !== controlActions.setRandomFailureRate) {
      return;
    }

    setControlBusy(true);
    setControlMessage("");

    const response = await fetch(`${API_BASE}/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceId: controlDeviceId,
        action,
        value,
      }),
    });

    setControlBusy(false);

    if (!response.ok) {
      setControlMessage("Simulation command failed");
      return;
    }

    setControlMessage("Simulation updated");
    refreshSummary().catch(() => {});
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,217,184,0.12),_transparent_34%),linear-gradient(180deg,_#08131b_0%,_#04090e_100%)] text-slate-100">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">
              Zenith Digital Twin
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              Intelligent Operations Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-full border px-4 py-2 text-sm ${
                connected
                  ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                  : "border-rose-300/20 bg-rose-300/10 text-rose-100"
              }`}
            >
              {connected ? "Backend connected" : "Backend offline"}
            </div>

            <button
              onClick={logout}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Total devices", summary.totalDevices, <Cpu key="cpu" className="h-5 w-5 text-cyan-200" />],
            ["Online", summary.onlineDevices, <Wifi key="wifi" className="h-5 w-5 text-emerald-200" />],
            ["Offline", summary.offlineDevices, <WifiOff key="wifioff" className="h-5 w-5 text-rose-200" />],
            ["Critical", summary.criticalDevices, <ShieldAlert key="shield" className="h-5 w-5 text-amber-200" />],
            ["Active alerts", summary.activeAlerts, <BellRing key="bell" className="h-5 w-5 text-rose-200" />],
            ["Anomalies today", summary.anomaliesDetectedToday, <AlertTriangle key="anomaly" className="h-5 w-5 text-orange-200" />],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm uppercase tracking-[0.2em] text-slate-400">{label}</span>
                {icon}
              </div>
              <p className="text-4xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Search className="h-5 w-5 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or ID"
                className="w-full bg-transparent text-white outline-none"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status} className="bg-slate-950">
                  {status}
                </option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
            >
              {locationOptions.map((location) => (
                <option key={location} value={location} className="bg-slate-950">
                  {location}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Multi-device temperature chart</h2>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid stroke="#15303b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    {chartDevices.map((device, index) => (
                      <Line
                        key={`${device.deviceId}-temperature`}
                        type="monotone"
                        dataKey={`${device.deviceId}_temperature`}
                        name={`${device.deviceId} temp`}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Multi-device battery chart</h2>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid stroke="#15303b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    {chartDevices.map((device, index) => (
                      <Line
                        key={`${device.deviceId}-battery`}
                        type="monotone"
                        dataKey={`${device.deviceId}_battery`}
                        name={`${device.deviceId} battery`}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="5 4"
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">3D digital twin</h2>
              <div className="mt-4">
                <DigitalTwinScene
                  devices={filteredDevices}
                  selectedDeviceId={selectedDevice?.deviceId ?? null}
                  onSelectDevice={setSelectedDeviceId}
                />
              </div>

              {selectedDevice ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Selected device
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{selectedDevice.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedDevice.deviceId} • {selectedDevice.location}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses(selectedDevice.status)}`}>
                      {selectedDevice.status}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs ${healthClasses(selectedDevice.healthStatus)}`}>
                      {selectedDevice.healthStatus}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs ${anomalyClasses(selectedDevice.anomalyState)}`}>
                      {selectedDevice.anomalyState}
                    </span>
                  </div>
                  <Link
                    href={`/device/${selectedDevice.deviceId}`}
                    className="mt-4 inline-block rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  >
                    Open device page
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Failure simulation controls</h2>

              <select
                value={controlDeviceId}
                onChange={(event) => setControlDeviceId(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId} className="bg-slate-950">
                    {device.deviceId} - {device.name}
                  </option>
                ))}
              </select>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button onClick={() => triggerControl(controlActions.triggerOffline)} disabled={controlBusy} className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  Trigger Offline
                </button>
                <button onClick={() => triggerControl(controlActions.triggerOverheat)} disabled={controlBusy} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  Trigger Overheat
                </button>
                <button onClick={() => triggerControl(controlActions.triggerLowBattery)} disabled={controlBusy} className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
                  Trigger Low Battery
                </button>
                <button onClick={() => triggerControl(controlActions.triggerTempSpike)} disabled={controlBusy} className="rounded-2xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-100">
                  Trigger Temp Spike
                </button>
              </div>

              <button
                onClick={() => triggerControl(controlActions.recoverDevice)}
                disabled={controlBusy}
                className="mt-3 w-full rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
              >
                Recover Device
              </button>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Random failure rate</span>
                  <span>{randomFailureRateInput}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={randomFailureRateInput}
                  onChange={(event) => setRandomFailureRateInput(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <button
                  onClick={() =>
                    triggerControl(controlActions.setRandomFailureRate, randomFailureRateInput)
                  }
                  disabled={controlBusy}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white"
                >
                  Apply failure rate
                </button>
              </div>

              {controlMessage ? (
                <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                  {controlMessage}
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Live alert panel</h2>
              <div className="mt-4 space-y-3">
                {visibleAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-slate-300">
                    No active alerts in the current filter view
                  </div>
                ) : (
                  visibleAlerts.slice(0, 6).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            {alert.deviceId}
                          </p>
                          <h3 className="mt-2 text-base font-semibold text-white">
                            {alert.title}
                          </h3>
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                          {alert.type}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{alert.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Devices</h2>
            <p className="text-sm text-slate-400">{filteredDevices.length} shown</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredDevices.map((device) => (
              <Link
                key={device.deviceId}
                href={`/device/${device.deviceId}`}
                className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                      {device.deviceId}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{device.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{device.deviceType}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusClasses(device.status)}`}>
                    {device.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${healthClasses(device.healthStatus)}`}>
                    {device.healthStatus}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs ${anomalyClasses(device.anomalyState)}`}>
                    {device.anomalyState}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Thermometer className="h-4 w-4 text-cyan-200" />
                      <span className="text-xs uppercase tracking-[0.25em]">Temperature</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {device.temperature.toFixed(1)} C
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Gauge className="h-4 w-4 text-cyan-200" />
                      <span className="text-xs uppercase tracking-[0.25em]">Battery</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {device.batteryLevel.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-slate-950/50 px-4 py-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{device.location}</span>
                    <span>{device.activeAlerts} active alerts</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
