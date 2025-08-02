const config = require(`${__dirname}/.config.json`);

module.exports = {
  apps: [
    {
      name: "syncthing",
      interpreter: "none",
      script: "/data/data/com.termux/files/usr/bin/syncthing",
    },
    {
      name: "devicectl-api",
      script: `${__dirname}/devicectl-api/index.js`,
      env: {
        MQTT_HOST: config.MQTT_HOST,
        SATELLITE_NAME: config.SATELLITE_NAME,
      },
    },
    {
      name: "wyoming-satellite",
      interpreter: "none",
      script: `${__dirname}/bin/start-wyoming-satellite`,
      env: {
        SATELLITE_NAME: config.SATELLITE_NAME,
      },
    },
  ],
};
