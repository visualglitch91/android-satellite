const { exec } = require("child_process");
const mqtt = require("mqtt");
const { createSensor } = require("./createSensor");
const { createNumber } = require("./createNumber");

const mqttHost = process.env.MQTT_HOST;
const namespace = process.env.SATELLITE_NAME.replaceAll(" ", "_").replaceAll(
  "-",
  "_"
);

if (!mqttHost || !namespace) {
  throw new Error("MQTT_HOST and NAMESPACE environment variables are required");
}

const mqttClient = mqtt.connect(mqttHost);
const UPDATE_INTERVAL = 5000;

function execCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

let $volume = null;
let $batteryStatus = null;

function updateVolume() {
  $volume = execCommand("termux-volume")
    .then(JSON.parse)
    .then((volumes) => {
      const music = volumes.find((v) => v.stream === "music");
      return music ? music.volume : 0;
    });
}

function updateBatteryStatus() {
  $batteryStatus = execCommand("termux-battery-status").then(JSON.parse);
}

updateVolume();
updateBatteryStatus();

setInterval(updateVolume, UPDATE_INTERVAL);
setInterval(updateBatteryStatus, UPDATE_INTERVAL);

mqttClient.on("connect", () => {
  createSensor({
    mqttClient,
    namespace: `${namespace}/battery`,
    unique_id: `${namespace}_battery_health`,
    name: "Battery Health",
    get_value: async () => (await $batteryStatus).health,
  });

  createSensor({
    mqttClient,
    namespace: `${namespace}/battery`,
    unique_id: `${namespace}_battery_plugged`,
    name: "Battery Plugged",
    get_value: async () => (await $batteryStatus).plugged,
  });

  createSensor({
    mqttClient,
    namespace: `${namespace}/battery`,
    unique_id: `${namespace}_battery_status`,
    name: "Battery Status",
    get_value: async () => (await $batteryStatus).status,
  });

  createSensor({
    mqttClient,
    namespace: `${namespace}/battery`,
    unique_id: `${namespace}_battery_percentage`,
    name: "Battery Percentage",
    get_value: async () => (await $batteryStatus).percentage,
    unit_of_measurement: "%",
  });

  createNumber({
    mqttClient,
    namespace: `${namespace}/volume`,
    unique_id: `${namespace}_volume`,
    name: "Volume",
    min: 0,
    max: 15,
    step: 1,
    get_value: () => ($volume === null ? Promise.resolve(0) : $volume),
    set_value: async (value) => {
      $volume = Promise.resolve(value);
      await execCommand(`termux-volume music ${value}`);
    },
  });
});
