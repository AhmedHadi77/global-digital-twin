const { io } = require("socket.io-client");
const model = require("../shared/deviceModel.json");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

const socket = io(BACKEND_URL, {

  transports: ["websocket"],
});

const devices = model.deviceCatalog.map((device) => ({
  ...device,
  active: true,
  batteryLevel: device.baseBatteryLevel,
}));

function varyValue(base, variance, decimals) {
  const value = base + (Math.random() * variance * 2 - variance);
  return Number(value.toFixed(decimals));
}

function buildPayload(device) {
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

function sendTelemetry(device) {
  const payload = buildPayload(device);
  console.log("Sending:", payload);
  socket.emit("sensor_data", payload);
}

socket.on("connect", () => {
  console.log("Simulator connected to backend:", socket.id);

  devices.forEach((device) => {
    sendTelemetry(device);
  });
});

socket.on("disconnect", () => {
  console.log("Simulator disconnected from backend");
});

setInterval(() => {
  devices.forEach((device) => {
    if (device.active) {
      sendTelemetry(device);
    }
  });
}, 1500);

setInterval(() => {
  const randomIndex = Math.floor(Math.random() * devices.length);
  const device = devices[randomIndex];

  device.active = !device.active;

  console.log(
    `[Simulator] ${device.deviceId} is now ${device.active ? "ONLINE" : "OFFLINE"}`
  );

  if (device.active) {
    sendTelemetry(device);
  }
}, 10000);
