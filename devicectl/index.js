const mqtt = require("mqtt");
const { exec } = require("child_process");
const { createSensor } = require("./createSensor");
const { createNumber } = require("./createNumber");

const config = {
  ...require("../config.json"),
  ...require("../config.local.json"),
};

const name = config.satellite_name;
const mqttHost = config.mqtt_host;
const namespace = name.replaceAll(" ", "_").replaceAll("-", "_");
const volumeType = config.volume_type || "termux";

if (!mqttHost || !namespace) {
  throw new Error("satellite_name and mqtt_host config variables are required");
}

const mqttClient = mqtt.connect(mqttHost);
const BATTERY_UPDATE_INTERVAL = 5000;
const VOLUME_UPDATE_INTERVAL = 1000;

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

const device = { name, id: namespace };

let currentVolume = null;
let batteryStatus$ = null;

async function getVolume() {
  if (volumeType === "termux") {
    try {
      const output = await execCommand("termux-volume");
      const volumes = JSON.parse(output);
      const musicVolume = volumes.find((v) => v.stream === "music");
      return musicVolume.volume;
    } catch (err) {
      console.error(err);
    }
  } else if (volumeType === "custom") {
    return require("../volume.local.js").getVolume();
  }

  return 0;
}

async function updateVolume() {
  if (volumeType === "termux") {
    try {
      await execCommand(`termux-volume music ${currentVolume}`);
    } catch (err) {
      console.error(err);
    }
  } else if (volumeType === "custom") {
    return require("../volume.local.js").setVolume(currentVolume);
  }
}

function updateBatteryStatus() {
  batteryStatus$ = execCommand("termux-battery-status").then(JSON.parse);
}

setInterval(updateVolume, VOLUME_UPDATE_INTERVAL);
setInterval(updateBatteryStatus, BATTERY_UPDATE_INTERVAL);

updateBatteryStatus();

getVolume().then((volume) => {
  currentVolume = volume;
});

mqttClient.on("connect", () => {
  console.log("MQTT connected", mqttHost);

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_health`,
    name: "Battery Health",
    get_value: async () => (await batteryStatus$).health,
  });

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_plugged`,
    name: "Battery Plugged",
    get_value: async () => (await batteryStatus$).plugged,
  });

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_status`,
    name: "Battery Status",
    get_value: async () => (await batteryStatus$).status,
  });

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_percentage`,
    name: "Battery Percentage",
    get_value: async () => (await batteryStatus$).percentage,
    unit_of_measurement: "%",
  });

  createNumber({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_volume`,
    name: "Volume",
    min: 0,
    max: volumeType === "termux" ? 15 : 100,
    step: 1,
    get_value: () => {
      return currentVolume || 0;
    },
    set_value: async (value) => {
      currentVolume = value;
    },
  });
});
