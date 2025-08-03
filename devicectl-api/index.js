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
const useTermuxVolume = config.use_termux_volume;

if (!mqttHost || !namespace) {
  throw new Error("satellite_name and mqtt_host config variables are required");
}

const mqttClient = mqtt.connect(mqttHost);
const UPDATE_INTERVAL = 5000;

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

const device = { name, id: namespace };

let $volume = null;
let $batteryStatus = null;

async function updateVolume() {
  if (useTermuxVolume) {
    try {
      const output = await execCommand("termux-volume");
      const volumes = JSON.parse(output);
      const musicVolume = volumes.find((v) => v.stream === "music");
      $volume = Promise.resolve(
        musicVolume
          ? Math.round((musicVolume.volume / musicVolume.max_volume) * 100)
          : 0
      );
    } catch {
      $volume = Promise.resolve(0);
    }
  } else {
    $volume = execCommand("pamixer --get-volume");
  }
}

function updateBatteryStatus() {
  $batteryStatus = execCommand("termux-battery-status").then(JSON.parse);
}

updateVolume();
updateBatteryStatus();

setInterval(updateVolume, UPDATE_INTERVAL);
setInterval(updateBatteryStatus, UPDATE_INTERVAL);

mqttClient.on("connect", () => {
  console.log("MQTT connected", mqttHost);

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_health`,
    name: "Battery Health",
    get_value: async () => (await $batteryStatus).health,
  });

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_plugged`,
    name: "Battery Plugged",
    get_value: async () => (await $batteryStatus).plugged,
  });

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_status`,
    name: "Battery Status",
    get_value: async () => (await $batteryStatus).status,
  });

  createSensor({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_battery_percentage`,
    name: "Battery Percentage",
    get_value: async () => (await $batteryStatus).percentage,
    unit_of_measurement: "%",
  });

  createNumber({
    mqttClient,
    namespace,
    device,
    unique_id: `${namespace}_volume`,
    name: "Volume",
    min: 0,
    max: 100,
    step: 1,
    get_value: () => ($volume === null ? Promise.resolve(0) : $volume),
    set_value: async (value) => {
      $volume = Promise.resolve(value);
      if (useTermuxVolume) {
        try {
          const output = await execCommand("termux-volume");
          const volumes = JSON.parse(output);
          const music = volumes.find((v) => v.stream === "music");
          if (!music) throw new Error("music stream not found");
          const target = Math.round((value / 100) * music.max_volume);
          await execCommand(`termux-volume music ${target}`);
        } catch {
          return;
        }
      } else {
        await execCommand(`pamixer --set-volume ${value}`);
      }
    },
  });
});
