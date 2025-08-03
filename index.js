const { shell } = require("./utils");

const config = {
  ...require("./config.json"),
  ...require("./config.local.json"),
};

(async () => {
  await shell("bootstrap", "pactl unload-module module-sles-source");
  await shell("bootstrap", "pactl load-module module-sles-source");

  if (config.enable_snapclient) {
    shell(
      "snapclient",
      `snapclient -h ${config.snapserver_host} --player pulse --hostId ${config.satellite_name}`
    );
  }

  shell(
    "wyoming-satellite",
    `cd /root/android-satellite/wyoming-satellite && python3 script/run \
      --name "${config.satellite_name}" \
      --uri tcp://0.0.0.0:10700 \
      --mic-command 'rec -r 16000 -c 1 -b 16 -e signed-integer -t raw --no-show-progress -' \
      --snd-command 'play -r 22050 -c 1 -b 16 -e signed-integer -t raw --no-show-progress -' \
      --wake-uri '${config.wake_uri}' \
      --wake-word-name '${config.wake_word}' \
      --awake-wav 'sounds/awake.wav' \
      --timer-finished-wav 'sounds/timer_finished.wav' \
      --no-zeroconf \
      --debug
    `
  );

  shell("devicectl-api", "node /root/android-satellite/devicectl-api/index.js");
})();
