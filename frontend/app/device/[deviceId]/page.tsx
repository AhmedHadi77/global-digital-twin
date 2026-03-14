"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Gauge,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DigitalTwinScene from "@/components/DigitalTwinScene";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

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
  lastUpdate: string | null;
}

interface Reading {
  id: number;
  temperature: number;
  vibration: number;
  batteryLevel: number;
  status: string;
  healthStatus: string;
  anomalyState: string;
  anomalyReason: string | null;
  anomalyScore: number;
  createdAt: string;
}

interface AlertHistory {
  id: number;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  isActive: boolean;
  triggeredAt: string;
  resolvedAt: string | null;
}

function statusClasses(status: Device["status"]) {
  return status === "Online"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-rose-400/30 bg-rose-400/10 text-rose-200";
}

function healthClasses(status: Device["healthStatus"]) {
  if (status === "CRITICAL") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  if (status === "WARNING") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  return "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";
}

export default function DeviceDetailsPage() {
  const params = useParams<{ deviceId: string }>();
  const deviceId = Array.isArray(params.deviceId)
    ? params.deviceId[0]
    : params.deviceId;

  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDetails() {
    const response = await fetch(`${API_BASE}/devices/${deviceId}/details`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setLoading(false);
      return;
    }

    const data = await response.json();
    setDevice(data.device);
    setReadings(data.readings || []);
    setAlerts(data.alerts || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!deviceId) {
      return;
    }

    loadDetails().catch(() => setLoading(false));

    const interval = setInterval(() => {
      loadDetails().catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [deviceId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,217,184,0.12),_transparent_34%),linear-gradient(180deg,_#08131b_0%,_#04090e_100%)] px-6 py-12 text-white">
        Loading device details...
      </main>
    );
  }

  if (!device) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,217,184,0.12),_transparent_34%),linear-gradient(180deg,_#08131b_0%,_#04090e_100%)] px-6 py-12 text-white">
        Device not found.
      </main>
    );
  }

  const chartData = [...readings].reverse().map((reading) => ({
    time: new Date(reading.createdAt).toLocaleTimeString(),
    temperature: reading.temperature,
    battery: reading.batteryLevel,
  }));

  const latestReading = readings[0];
  const anomalyHistory = alerts.filter((alert) => alert.alertType === "ANOMALY");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,217,184,0.12),_transparent_34%),linear-gradient(180deg,_#08131b_0%,_#04090e_100%)] px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div
            className={`rounded-full border px-4 py-2 text-sm ${statusClasses(device.status)}`}
          >
            {device.status === "Online" ? (
              <Wifi className="mr-2 inline h-4 w-4" />
            ) : (
              <WifiOff className="mr-2 inline h-4 w-4" />
            )}
            {device.status}
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                {device.deviceId}
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {device.name}
              </h1>
              <p className="mt-2 text-slate-400">
                {device.deviceType} • {device.location}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${healthClasses(device.healthStatus)}`}
                >
                  {device.healthStatus}
                </span>
                <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-xs text-orange-100">
                  {device.anomalyState}
                </span>
              </div>

              {device.anomalyReason ? (
                <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm text-orange-50">
                  {device.anomalyReason}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Thermometer className="h-4 w-4 text-cyan-200" />
                  <span className="text-xs uppercase tracking-[0.25em]">
                    Temperature
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {device.temperature.toFixed(1)} C
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <Gauge className="h-4 w-4 text-cyan-200" />
                  <span className="text-xs uppercase tracking-[0.25em]">
                    Battery
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {device.batteryLevel.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-2 text-slate-400">
                  <AlertTriangle className="h-4 w-4 text-cyan-200" />
                  <span className="text-xs uppercase tracking-[0.25em]">
                    Active alerts
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">
                  {device.activeAlerts}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Mini chart</h2>
              <div className="mt-4 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#15303b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Temperature"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="battery"
                      name="Battery"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Alert history</h2>
              <div className="mt-4 space-y-3">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-slate-300">
                    No alert history yet
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-base font-semibold text-white">
                          {alert.title}
                        </h3>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200">
                          {alert.alertType}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        {alert.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">
                Selected twin view
              </h2>
              <div className="mt-4">
                <DigitalTwinScene
                  devices={[device]}
                  selectedDeviceId={device.deviceId}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">Latest reading</h2>
              {latestReading ? (
                <div className="mt-4 space-y-3 text-slate-300">
                  <p>Temperature: {latestReading.temperature.toFixed(1)} C</p>
                  <p>Vibration: {latestReading.vibration.toFixed(2)} Hz</p>
                  <p>Battery: {latestReading.batteryLevel.toFixed(1)}%</p>
                  <p>Time: {new Date(latestReading.createdAt).toLocaleString()}</p>
                </div>
              ) : (
                <div className="mt-4 text-slate-400">No reading history yet</div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/45 p-6">
              <h2 className="text-xl font-semibold text-white">
                Anomaly history
              </h2>
              <div className="mt-4 space-y-3">
                {anomalyHistory.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-slate-300">
                    No anomaly history yet
                  </div>
                ) : (
                  anomalyHistory.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4"
                    >
                      <h3 className="text-base font-semibold text-white">
                        {alert.title}
                      </h3>
                      <p className="mt-2 text-sm text-orange-50">
                        {alert.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
