require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const model = require("../shared/deviceModel.json");

const app = express();
const server = http.createServer(app);

const { deviceCatalog, thresholds, controlActions } = model;

const STATUS = {
  ONLINE: "Online",
  OFFLINE: "Offline",
};

const HEALTH = {
  OPERATIONAL: "OPERATIONAL",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
};

const ANOMALY = {
  STABLE: "STABLE",
  DETECTED: "ANOMALY",
};

const RUN_EMBEDDED_SIMULATOR =
  process.env.RUN_EMBEDDED_SIMULATOR === "true";
const DB_QUERY_TIMEOUT_MS = Number(process.env.DB_QUERY_TIMEOUT_MS || 3500);

const appPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  connectionTimeoutMillis: Number(
    process.env.DB_CONNECTION_TIMEOUT_MS || 5000
  ),
  statement_timeout: DB_QUERY_TIMEOUT_MS,
  query_timeout: DB_QUERY_TIMEOUT_MS,
});

const rawOrigins = process.env.FRONTEND_URLS || "http://localhost:3000";
const allowAllOrigins = rawOrigins === "*";
const allowedOrigins = rawOrigins.split(",").map((value) => value.trim());

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed: ${origin}`));
  },
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions,
});

function createInitialDeviceState(device) {
  return {
    deviceId: device.deviceId,
    name: device.name,
    deviceType: device.deviceType,
    location: device.location,
    status: STATUS.OFFLINE,
    healthStatus: HEALTH.OPERATIONAL,
    anomalyState: ANOMALY.STABLE,
    anomalyReason: null,
    anomalyScore: 0,
    temperature: device.baseTemperature,
    vibration: device.baseVibration,
    batteryLevel: device.baseBatteryLevel,
    activeAlerts: 0,
    lastUpdate: null,
  };
}

const catalogMap = new Map(
  deviceCatalog.map((device) => [device.deviceId, device])
);

const virtualDevices = new Map(
  deviceCatalog.map((device) => [
    device.deviceId,
    createInitialDeviceState(device),
  ])
);

const recentReadings = new Map(
  deviceCatalog.map((device) => [device.deviceId, []])
);

const activeAlerts = new Map();

const simulationState = {
  randomFailureRate: 0.08,
  deviceOverrides: new Map(),
};

const embeddedSimulatorDevices = deviceCatalog.map((device) => ({
  ...device,
  active: true,
  batteryLevel: device.baseBatteryLevel,
}));

let embeddedSimulatorStarted = false;

function getOverride(deviceId) {
  return (
    simulationState.deviceOverrides.get(deviceId) ?? {
      forceOffline: false,
      forceOverheat: false,
      forceLowBattery: false,
      forceTempSpike: false,
    }
  );
}

function setOverride(deviceId, nextValue) {
  simulationState.deviceOverrides.set(deviceId, nextValue);
  return nextValue;
}

function clearOverride(deviceId) {
  simulationState.deviceOverrides.delete(deviceId);
}

function calculateStatus(lastUpdate) {
  if (!lastUpdate) {
    return STATUS.OFFLINE;
  }

  const age = Date.now() - new Date(lastUpdate).getTime();
  return age > thresholds.offlineMs ? STATUS.OFFLINE : STATUS.ONLINE;
}

function calculateHealth(temperature, batteryLevel) {
  if (temperature >= 90 || batteryLevel <= 10) {
    return HEALTH.CRITICAL;
  }

  if (temperature >= 75 || batteryLevel <= thresholds.lowBattery) {
    return HEALTH.WARNING;
  }

  return HEALTH.OPERATIONAL;
}

function activeAlertCount(deviceId) {
  return Array.from(activeAlerts.values()).filter(
    (alert) => alert.deviceId === deviceId
  ).length;
}

function buildDeviceSnapshot(device) {
  const liveStatus = calculateStatus(device.lastUpdate);

  return {
    ...device,
    status: liveStatus,
    activeAlerts: activeAlertCount(device.deviceId),
    simulationState: getOverride(device.deviceId),
  };
}

function getDevicesSnapshot() {
  return Array.from(virtualDevices.values())
    .map(buildDeviceSnapshot)
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId));
}

function normalizeNumber(value, decimals) {
  return Number(Number(value).toFixed(decimals));
}

function applySimulationControls(deviceId, reading) {
  const override = getOverride(deviceId);

  if (override.forceOffline) {
    return { dropped: true, reading };
  }

  let { temperature, vibration, batteryLevel } = reading;

  if (override.forceOverheat) {
    temperature = Math.max(temperature, thresholds.overheat + 12);
  }

  if (override.forceTempSpike) {
    temperature += 16;
    vibration += 1.15;
  }

  if (override.forceLowBattery) {
    batteryLevel = Math.min(batteryLevel, thresholds.lowBattery - 5);
  }

  if (Math.random() < simulationState.randomFailureRate) {
    const effect = Math.floor(Math.random() * 3);

    if (effect === 0) {
      temperature += 14;
      vibration += 0.9;
    }

    if (effect === 1) {
      batteryLevel = Math.min(batteryLevel, thresholds.lowBattery - 4);
    }

    if (effect === 2) {
      vibration += 1.2;
    }
  }

  return {
    dropped: false,
    reading: {
      temperature: normalizeNumber(temperature, 1),
      vibration: normalizeNumber(Math.max(vibration, 0.05), 2),
      batteryLevel: normalizeNumber(
        Math.min(Math.max(batteryLevel, 1), 100),
        1
      ),
    },
  };
}

function detectAnomaly(deviceId, nextReading) {
  const history = recentReadings.get(deviceId) ?? [];

  if (history.length < 5) {
    return null;
  }

  const averageTemperature =
    history.reduce((sum, item) => sum + item.temperature, 0) / history.length;

  const averageVibration =
    history.reduce((sum, item) => sum + item.vibration, 0) / history.length;

  const temperatureDelta = Math.abs(
    nextReading.temperature - averageTemperature
  );
  const vibrationDelta = Math.abs(nextReading.vibration - averageVibration);

  if (
    temperatureDelta < thresholds.tempAnomalyDelta &&
    vibrationDelta < thresholds.vibrationAnomalyDelta
  ) {
    return null;
  }

  return {
    score: normalizeNumber(
      Math.max(
        temperatureDelta / thresholds.tempAnomalyDelta,
        vibrationDelta / thresholds.vibrationAnomalyDelta
      ),
      2
    ),
    reason:
      temperatureDelta >= thresholds.tempAnomalyDelta &&
      vibrationDelta >= thresholds.vibrationAnomalyDelta
        ? "Temperature and vibration moved sharply away from the recent baseline."
        : temperatureDelta >= thresholds.tempAnomalyDelta
          ? `Temperature deviated by ${normalizeNumber(
              temperatureDelta,
              1
            )} C from baseline.`
          : `Vibration deviated by ${normalizeNumber(
              vibrationDelta,
              2
            )} Hz from baseline.`,
  };
}

function pushRecentReading(deviceId, reading) {
  const previous = recentReadings.get(deviceId) ?? [];
  const next = [
    ...previous,
    {
      temperature: reading.temperature,
      vibration: reading.vibration,
      batteryLevel: reading.batteryLevel,
      status: reading.status,
      healthStatus: reading.healthStatus,
      anomalyState: reading.anomalyState,
      anomalyReason: reading.anomalyReason,
      anomalyScore: reading.anomalyScore,
      createdAt: reading.createdAt ?? new Date().toISOString(),
    },
  ].slice(-thresholds.historyLimit);

  recentReadings.set(deviceId, next);
}

function buildLiveReading(device, reading, index) {
  const createdAt =
    reading.createdAt ??
    device.lastUpdate ??
    new Date(Date.now() - index * 1500).toISOString();

  return {
    id: `live-${device.deviceId}-${createdAt}`,
    temperature: reading.temperature,
    vibration: reading.vibration,
    batteryLevel: reading.batteryLevel,
    status: reading.status ?? device.status,
    healthStatus: reading.healthStatus ?? device.healthStatus,
    anomalyState: reading.anomalyState ?? device.anomalyState,
    anomalyReason: reading.anomalyReason ?? device.anomalyReason,
    anomalyScore: reading.anomalyScore ?? device.anomalyScore,
    createdAt,
  };
}

function getLiveReadingHistory(device) {
  const history = recentReadings.get(device.deviceId) ?? [];
  const readings = history
    .map((reading, index) => buildLiveReading(device, reading, index))
    .reverse();

  if (
    device.lastUpdate &&
    !readings.some((reading) => reading.createdAt === device.lastUpdate)
  ) {
    readings.unshift(
      buildLiveReading(
        device,
        {
          temperature: device.temperature,
          vibration: device.vibration,
          batteryLevel: device.batteryLevel,
          status: device.status,
          healthStatus: device.healthStatus,
          anomalyState: device.anomalyState,
          anomalyReason: device.anomalyReason,
          anomalyScore: device.anomalyScore,
          createdAt: device.lastUpdate,
        },
        0
      )
    );
  }

  if (readings.length === 0) {
    readings.push(
      buildLiveReading(
        device,
        {
          temperature: device.temperature,
          vibration: device.vibration,
          batteryLevel: device.batteryLevel,
          status: device.status,
          healthStatus: device.healthStatus,
          anomalyState: device.anomalyState,
          anomalyReason: device.anomalyReason,
          anomalyScore: device.anomalyScore,
          createdAt: device.lastUpdate ?? new Date().toISOString(),
        },
        0
      )
    );
  }

  return readings.slice(0, 24);
}

function getLiveAlertHistory(deviceId) {
  return getAlertsSnapshot()
    .filter((alert) => alert.deviceId === deviceId)
    .map((alert) => ({
      id: alert.id,
      alertType: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      isActive: true,
      triggeredAt: alert.triggeredAt,
      resolvedAt: null,
    }));
}

async function persistDeviceSnapshot(device) {
  try {
    await appPool.query(
      `INSERT INTO devices
       (device_id, name, device_type, location, status, health_status, anomaly_state,
        anomaly_reason, anomaly_score, battery_level, last_temperature, last_vibration,
        active_alerts, last_seen_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
       ON CONFLICT (device_id) DO UPDATE SET
         name = EXCLUDED.name,
         device_type = EXCLUDED.device_type,
         location = EXCLUDED.location,
         status = EXCLUDED.status,
         health_status = EXCLUDED.health_status,
         anomaly_state = EXCLUDED.anomaly_state,
         anomaly_reason = EXCLUDED.anomaly_reason,
         anomaly_score = EXCLUDED.anomaly_score,
         battery_level = EXCLUDED.battery_level,
         last_temperature = EXCLUDED.last_temperature,
         last_vibration = EXCLUDED.last_vibration,
         active_alerts = EXCLUDED.active_alerts,
         last_seen_at = EXCLUDED.last_seen_at,
         updated_at = NOW()`,
      [
        device.deviceId,
        device.name,
        device.deviceType,
        device.location,
        device.status,
        device.healthStatus,
        device.anomalyState,
        device.anomalyReason,
        device.anomalyScore,
        device.batteryLevel,
        device.temperature,
        device.vibration,
        device.activeAlerts,
        device.lastUpdate,
      ]
    );
  } catch (error) {
    console.error("Persist device snapshot failed:", error.message);
  }
}

async function persistReading(device) {
  try {
    await appPool.query(
      `INSERT INTO device_readings
       (device_id, temperature, vibration, battery_level, status, health_status,
        anomaly_state, anomaly_reason, anomaly_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        device.deviceId,
        device.temperature,
        device.vibration,
        device.batteryLevel,
        device.status,
        device.healthStatus,
        device.anomalyState,
        device.anomalyReason,
        device.anomalyScore,
      ]
    );
  } catch (error) {
    console.error("Persist reading failed:", error.message);
  }
}

function alertKey(type, deviceId) {
  return `${type}:${deviceId}`;
}

async function ensureAlertActive(alert) {
  const key = alertKey(alert.type, alert.deviceId);
  const existing = activeAlerts.get(key);
  const now = new Date().toISOString();

  if (existing) {
    activeAlerts.set(key, {
      ...existing,
      ...alert,
      updatedAt: now,
    });
    return;
  }

  let dbId = null;

  try {
    const result = await appPool.query(
      `INSERT INTO alerts
       (alert_key, device_id, alert_type, severity, title, message, is_active, triggered_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE,NOW(),$7)
       RETURNING id`,
      [
        key,
        alert.deviceId,
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        JSON.stringify({
          temperature: alert.temperature ?? null,
          batteryLevel: alert.batteryLevel ?? null,
          anomalyScore: alert.anomalyScore ?? null,
        }),
      ]
    );

    dbId = result.rows[0]?.id ?? null;
  } catch (error) {
    console.error("Persist alert failed:", error.message);
  }

  activeAlerts.set(key, {
    ...alert,
    id: key,
    dbId,
    triggeredAt: now,
    updatedAt: now,
  });
}

async function resolveAlert(type, deviceId) {
  const key = alertKey(type, deviceId);
  const existing = activeAlerts.get(key);

  if (!existing) {
    return;
  }

  if (existing.dbId) {
    try {
      await appPool.query(
        `UPDATE alerts
         SET is_active = FALSE, resolved_at = NOW()
         WHERE id = $1`,
        [existing.dbId]
      );
    } catch (error) {
      console.error("Resolve alert failed:", error.message);
    }
  }

  activeAlerts.delete(key);
}

function getAlertsSnapshot() {
  return Array.from(activeAlerts.values())
    .map(({ dbId, ...alert }) => alert)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

async function syncAlerts() {
  for (const device of virtualDevices.values()) {
    if (!device.lastUpdate) {
      await resolveAlert("OFFLINE", device.deviceId);
      await resolveAlert("OVERHEAT", device.deviceId);
      await resolveAlert("LOW_BATTERY", device.deviceId);
      await resolveAlert("ANOMALY", device.deviceId);
      continue;
    }

    const status = calculateStatus(device.lastUpdate);

    if (status === STATUS.OFFLINE) {
      await ensureAlertActive({
        type: "OFFLINE",
        severity: "high",
        title: `${device.name} is offline`,
        message: `${device.deviceId} has not sent telemetry for more than 5 seconds.`,
        deviceId: device.deviceId,
        deviceName: device.name,
        location: device.location,
        status,
      });
    } else {
      await resolveAlert("OFFLINE", device.deviceId);
    }

    if (device.temperature >= thresholds.overheat) {
      await ensureAlertActive({
        type: "OVERHEAT",
        severity: device.temperature >= 90 ? "critical" : "high",
        title: `${device.name} is overheating`,
        message: `${device.deviceId} reached ${device.temperature.toFixed(1)} C.`,
        deviceId: device.deviceId,
        deviceName: device.name,
        location: device.location,
        temperature: device.temperature,
        status,
      });
    } else {
      await resolveAlert("OVERHEAT", device.deviceId);
    }

    if (device.batteryLevel <= thresholds.lowBattery) {
      await ensureAlertActive({
        type: "LOW_BATTERY",
        severity: device.batteryLevel <= 8 ? "critical" : "high",
        title: `${device.name} has low battery`,
        message: `${device.deviceId} battery is at ${device.batteryLevel.toFixed(1)}%.`,
        deviceId: device.deviceId,
        deviceName: device.name,
        location: device.location,
        batteryLevel: device.batteryLevel,
        status,
      });
    } else {
      await resolveAlert("LOW_BATTERY", device.deviceId);
    }

    if (device.anomalyState === ANOMALY.DETECTED) {
      await ensureAlertActive({
        type: "ANOMALY",
        severity: device.anomalyScore >= 1.6 ? "critical" : "high",
        title: `${device.name} anomaly detected`,
        message: device.anomalyReason,
        deviceId: device.deviceId,
        deviceName: device.name,
        location: device.location,
        anomalyScore: device.anomalyScore,
        status,
      });
    } else {
      await resolveAlert("ANOMALY", device.deviceId);
    }
  }
}

async function emitSnapshots() {
  await syncAlerts();

  const snapshots = getDevicesSnapshot();

  for (const device of snapshots) {
    await persistDeviceSnapshot(device);
  }

  io.emit("update_ui", snapshots);
  io.emit("alerts_update", getAlertsSnapshot());
}

async function testDatabase() {
  try {
    await appPool.query("SELECT NOW()");
    console.log("Database connection established");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

async function seedRegistry() {
  for (const device of deviceCatalog) {
    const snapshot = buildDeviceSnapshot(createInitialDeviceState(device));
    await persistDeviceSnapshot(snapshot);
  }
}

async function getAnomaliesTodayCount() {
  const rows = await queryRowsWithTimeout(
    `SELECT COUNT(*)::int AS count
     FROM alerts
     WHERE alert_type = 'ANOMALY'
       AND triggered_at::date = CURRENT_DATE`,
    [],
    "Count today's anomalies"
  );

  return rows[0]?.count ?? 0;
}

async function queryRowsWithTimeout(queryText, params, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${DB_QUERY_TIMEOUT_MS}ms`));
    }, DB_QUERY_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([appPool.query(queryText, params), timeout]);
    return result.rows;
  } catch (error) {
    console.error(`${label} failed:`, error.message);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function varyValue(base, variance, decimals) {
  const value = base + (Math.random() * variance * 2 - variance);
  return Number(value.toFixed(decimals));
}

function buildEmbeddedPayload(device) {
  device.batteryLevel = Math.max(
    8,
    Number((device.batteryLevel - Math.random() * 0.45).toFixed(1))
  );

  if (device.batteryLevel <= 12 && Math.random() < 0.08) {
    device.batteryLevel = device.baseBatteryLevel;
  }

  const temperatureBase =
    Math.random() < device.tempSpikeChance
      ? device.baseTemperature + device.tempSpikeBoost
      : device.baseTemperature;

  const vibrationBase =
    Math.random() < device.vibrationSpikeChance
      ? device.baseVibration + device.vibrationSpikeBoost
      : device.baseVibration;

  return {
    deviceId: device.deviceId,
    name: device.name,
    deviceType: device.deviceType,
    location: device.location,
    temperature: varyValue(temperatureBase, 3.2, 1),
    vibration: Math.max(0.05, varyValue(vibrationBase, 0.22, 2)),
    batteryLevel: device.batteryLevel,
  };
}

async function processTelemetry(payload) {
  const baseDevice = catalogMap.get(payload.deviceId);

  if (!baseDevice) {
    return;
  }

  const rawReading = {
    temperature: Number(payload.temperature),
    vibration: Number(payload.vibration),
    batteryLevel: Number(payload.batteryLevel),
  };

  if (
    !Number.isFinite(rawReading.temperature) ||
    !Number.isFinite(rawReading.vibration) ||
    !Number.isFinite(rawReading.batteryLevel)
  ) {
    console.warn("Invalid telemetry payload received:", payload);
    return;
  }

  const simulated = applySimulationControls(payload.deviceId, rawReading);

  if (simulated.dropped) {
    return;
  }

  const reading = simulated.reading;
  const override = getOverride(payload.deviceId);
  let anomaly = detectAnomaly(payload.deviceId, reading);

  if (!anomaly && override.forceTempSpike) {
    anomaly = {
      score: 1.8,
      reason:
        "Injected temperature spike moved telemetry outside the expected operating baseline.",
    };
  }

  if (!anomaly && override.forceOverheat) {
    anomaly = {
      score: 1.5,
      reason:
        "Forced overheat condition pushed device temperature beyond the normal operating range.",
    };
  }

  const healthStatus = calculateHealth(
    reading.temperature,
    reading.batteryLevel
  );

  const nextState = {
    deviceId: baseDevice.deviceId,
    name: baseDevice.name,
    deviceType: baseDevice.deviceType,
    location: baseDevice.location,
    temperature: reading.temperature,
    vibration: reading.vibration,
    batteryLevel: reading.batteryLevel,
    status: STATUS.ONLINE,
    healthStatus,
    anomalyState: anomaly ? ANOMALY.DETECTED : ANOMALY.STABLE,
    anomalyReason: anomaly ? anomaly.reason : null,
    anomalyScore: anomaly ? anomaly.score : 0,
    activeAlerts: 0,
    lastUpdate: new Date().toISOString(),
  };

  virtualDevices.set(baseDevice.deviceId, nextState);
  pushRecentReading(baseDevice.deviceId, nextState);

  await persistReading(buildDeviceSnapshot(nextState));
  await emitSnapshots();
}

function startEmbeddedSimulator() {
  if (embeddedSimulatorStarted) {
    return;
  }

  embeddedSimulatorStarted = true;
  console.log("Embedded simulator enabled");

  embeddedSimulatorDevices.forEach((device) => {
    if (device.active) {
      processTelemetry(buildEmbeddedPayload(device)).catch((error) => {
        console.error("Embedded simulator send error:", error.message);
      });
    }
  });

  setInterval(() => {
    embeddedSimulatorDevices.forEach((device) => {
      if (device.active) {
        processTelemetry(buildEmbeddedPayload(device)).catch((error) => {
          console.error("Embedded simulator send error:", error.message);
        });
      }
    });
  }, 1500);

  setInterval(() => {
    const randomIndex = Math.floor(
      Math.random() * embeddedSimulatorDevices.length
    );
    const device = embeddedSimulatorDevices[randomIndex];

    device.active = !device.active;

    console.log(
      `[Embedded Simulator] ${device.deviceId} is now ${
        device.active ? "ONLINE" : "OFFLINE"
      }`
    );

    if (device.active) {
      processTelemetry(buildEmbeddedPayload(device)).catch((error) => {
        console.error("Embedded simulator send error:", error.message);
      });
    }
  }, 10000);
}

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    devices: virtualDevices.size,
    alerts: activeAlerts.size,
    embeddedSimulator: RUN_EMBEDDED_SIMULATOR,
  });
});

app.get("/summary", async (req, res) => {
  const devices = getDevicesSnapshot();

  res.json({
    totalDevices: devices.length,
    onlineDevices: devices.filter(
      (device) => device.status === STATUS.ONLINE
    ).length,
    offlineDevices: devices.filter(
      (device) => device.status === STATUS.OFFLINE
    ).length,
    criticalDevices: devices.filter(
      (device) => device.healthStatus === HEALTH.CRITICAL
    ).length,
    activeAlerts: getAlertsSnapshot().length,
    anomaliesDetectedToday: await getAnomaliesTodayCount(),
    randomFailureRate: simulationState.randomFailureRate,
  });
});

app.get("/devices", (req, res) => {
  res.json(getDevicesSnapshot());
});
app.get("/alerts", (req, res) => {
  res.json(getAlertsSnapshot());
});

app.get("/devices/:deviceId/details", async (req, res) => {
  const { deviceId } = req.params;
  const current = getDevicesSnapshot().find(
    (device) => device.deviceId === deviceId
  );

  if (!current) {
    res.status(404).json({ message: "Device not found" });
    return;
  }

  const [storedReadings, storedAlerts] = await Promise.all([
    queryRowsWithTimeout(
      `SELECT
         id,
         temperature::float AS temperature,
         vibration::float AS vibration,
         battery_level::float AS "batteryLevel",
         status AS status,
         health_status AS "healthStatus",
         anomaly_state AS "anomalyState",
         anomaly_reason AS "anomalyReason",
         anomaly_score::float AS "anomalyScore",
         created_at AS "createdAt"
       FROM device_readings
       WHERE device_id = $1
       ORDER BY created_at DESC
       LIMIT 24`,
      [deviceId],
      "Load device readings"
    ),
    queryRowsWithTimeout(
      `SELECT
         id,
         alert_type AS "alertType",
         severity,
         title,
         message,
         is_active AS "isActive",
         triggered_at AS "triggeredAt",
         resolved_at AS "resolvedAt"
       FROM alerts
       WHERE device_id = $1
       ORDER BY triggered_at DESC
       LIMIT 24`,
      [deviceId],
      "Load device alerts"
    ),
  ]);

  const liveAlerts = getLiveAlertHistory(deviceId);
  const alertKeys = new Set(
    liveAlerts.map((alert) => `${alert.alertType}:${alert.title}`)
  );
  const alerts = [
    ...liveAlerts,
    ...storedAlerts.filter((alert) => {
      const key = `${alert.alertType}:${alert.title}`;

      if (alertKeys.has(key)) {
        return false;
      }

      alertKeys.add(key);
      return true;
    }),
  ].slice(0, 24);

  const readings =
    storedReadings.length > 0 ? storedReadings : getLiveReadingHistory(current);

  res.json({
    device: current,
    readings,
    alerts,
  });
});

app.post("/simulate", async (req, res) => {
  const { deviceId, action, value } = req.body;

  if (action === controlActions.setRandomFailureRate) {
    const normalized = Number(value);
    simulationState.randomFailureRate =
      normalized > 1
        ? Math.min(Math.max(normalized / 100, 0), 1)
        : Math.min(Math.max(normalized, 0), 1);

    res.json({
      ok: true,
      randomFailureRate: simulationState.randomFailureRate,
    });
    return;
  }

  if (!deviceId || !catalogMap.has(deviceId)) {
    res.status(404).json({ message: "Device not found" });
    return;
  }

  const current = getOverride(deviceId);

  if (action === controlActions.triggerOffline) {
    setOverride(deviceId, { ...current, forceOffline: true });
  }

  if (action === controlActions.triggerOverheat) {
    setOverride(deviceId, { ...current, forceOverheat: true });
  }

  if (action === controlActions.triggerLowBattery) {
    setOverride(deviceId, { ...current, forceLowBattery: true });
  }

  if (action === controlActions.triggerTempSpike) {
    setOverride(deviceId, { ...current, forceTempSpike: true });
  }

  if (action === controlActions.recoverDevice) {
    clearOverride(deviceId);
  }

  await emitSnapshots();

  res.json({
    ok: true,
    deviceId,
    simulationState: getOverride(deviceId),
  });
});

io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
  socket.emit("update_ui", getDevicesSnapshot());
  socket.emit("alerts_update", getAlertsSnapshot());

  socket.on("sensor_data", async (payload) => {
    try {
      await processTelemetry(payload);
    } catch (error) {
      console.error("Telemetry processing error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

setInterval(() => {
  emitSnapshots().catch((error) => {
    console.error("Snapshot emit error:", error.message);
  });
}, 1000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Digital Twin Engine running on port ${PORT}`);
  console.log("Waiting for simulator telemetry...");
  await testDatabase();
  await seedRegistry();

  if (RUN_EMBEDDED_SIMULATOR) {
    startEmbeddedSimulator();
  }
});
