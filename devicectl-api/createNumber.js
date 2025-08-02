const { handleAutoDiscovery } = require("./utils");

function createNumber({
  mqttClient,
  namespace,
  unique_id,
  name,
  get_value,
  set_value,
  min,
  max,
  step,
  unit_of_measurement,
  device = undefined,
  interval = 5000,
}) {
  const state_topic = `${namespace}/number/${unique_id}/state`;
  const command_topic = `${namespace}/number/${unique_id}/set`;

  let currentValue = null;

  const publishState = async () => {
    if (currentValue !== null) {
      mqttClient.publish(
        state_topic,
        String(currentValue),
        { retain: true },
        (err) => {
          if (err) {
            console.error(`Failed to publish state to ${state_topic}:`, err);
          }
        }
      );
    }
  };

  mqttClient.subscribe(command_topic, (err) => {
    if (err) {
      console.error(`Failed to subscribe to ${command_topic}:`, err);
    }
  });

  mqttClient.on("message", async (topic, message) => {
    if (topic === command_topic) {
      const payload = message.toString();
      const value = Number(payload);
      if (!isNaN(value)) {
        if (
          (min !== undefined && value < min) ||
          (max !== undefined && value > max)
        ) {
          console.warn(`Received value ${value} out of range [${min}, ${max}]`);
          return;
        }
        try {
          await set_value(value);
          currentValue = value;
          await publishState();
        } catch (err) {
          console.error("Failed to set value:", err);
        }
      } else {
        console.warn(`Received invalid number payload: ${payload}`);
      }
    }
  });

  setInterval(async () => {
    try {
      const newValue = await get_value();
      if (newValue !== currentValue) {
        currentValue = newValue;
        await publishState();
      }
    } catch (err) {
      console.error("Failed to get value:", err);
    }
  }, interval);

  (async () => {
    try {
      currentValue = await get_value();
      await publishState();
    } catch (err) {
      console.error("Failed to initialize value:", err);
    }
  })();

  handleAutoDiscovery({
    mqttClient,
    namespace,
    domain: "number",
    config: {
      name,
      unique_id,
      state_topic,
      command_topic,
      min,
      max,
      step,
      unit_of_measurement,
      device_class: null,
      device: device
        ? { name: device.name, identifiers: [device.id] }
        : undefined,
    },
  });

  return {
    set: async (value) => {
      if (
        (min !== undefined && value < min) ||
        (max !== undefined && value > max)
      ) {
        throw new RangeError(`Value ${value} out of range [${min}, ${max}]`);
      }
      await set_value(value);
      currentValue = value;
      await publishState();
    },
    get: async () => {
      const val = await get_value();
      currentValue = val;
      return val;
    },
  };
}

module.exports = { createNumber };
