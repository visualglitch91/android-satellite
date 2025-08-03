const { shell } = require("./utils");

(async () => {
  await shell("bootstrap", "pactl unload-module module-sles-source");
  await shell("bootstrap", "pactl load-module module-sles-source");

  shell("snapclient", "snapclient -h 10.0.0.4 --player pulse");

  shell(
    "wyoming-satellite",
    `python3 script/run \
      --name "$SATELLITE_NAME" \
      --uri tcp://0.0.0.0:10700 \
      --mic-command 'rec -r 16000 -c 1 -b 16 -e signed-integer -t raw --no-show-progress -' \
      --snd-command 'play -r 22050 -c 1 -b 16 -e signed-integer -t raw --no-show-progress -' \
      --wake-uri 'tcp://10.0.0.7:10400' \
      --wake-word-name 'alexa' \
      --awake-wav 'sounds/awake.wav' \
      --timer-finished-wav 'sounds/timer_finished.wav' \
      --debug
    `
  );

  shell("devicectl-api", "node devicectl-api/index.js");
})();
