module.exports = {
  apps: [
    {
      name: "wyoming-satellite",
      cwd: __dirname,
      interpreter: "none",
      script: "sh",
      args: "./bin/start-wyoming-satellite",
      cron_restart: "0 */3 * * *",
    },
    {
      name: "devicectl",
      cwd: __dirname,
      script: "./devicectl/index.js",
    },
  ],
};
