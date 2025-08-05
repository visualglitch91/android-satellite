module.exports = {
  apps: [
    {
      name: "syncthing",
      interpreter: "none",
      script: "syncthing",
    },
    {
      name: "wyoming-satellite",
      cwd: __dirname,
      interpreter: "none",
      script: "sh",
      args: "./bin/start-wyoming-satellite",
    },
    {
      name: "devicectl",
      cwd: __dirname,
      script: "./devicectl/index.js",
    },
  ],
};
