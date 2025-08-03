module.exports = {
  apps: [
    {
      name: "syncthing",
      interpreter: "none",
      script: "syncthing",
    },
    {
      name: "android-satellite",
      interpreter: "none",
      script: "sh",
      args:
        '-c "pactl load-module module-native-protocol-tcp auth-anonymous=1 && ' +
        "proot-distro login debian -- " +
        'PULSE_SERVER=127.0.0.1 node /root/android-satellite/index.js"',
    },
  ],
};
