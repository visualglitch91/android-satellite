function handleAutoDiscovery({ mqttClient, namespace, domain, config }) {
  const publish = () => {
    const discoveryTopic = `homeassistant/${domain}/${namespace}/${config.unique_id}/config`;

    mqttClient.publish(
      discoveryTopic,
      JSON.stringify(config),
      { retain: true },
      (err) => {
        if (err) {
          console.error(
            `Failed to publish auto-discovery payload to ${discoveryTopic}:`,
            err
          );
        } else {
          console.log(
            `Published auto-discovery payload to ${discoveryTopic}`,
            JSON.stringify(config, null, 2)
          );
        }
      }
    );
  };

  publish();
  mqttClient.on("connect", publish);
  mqttClient.on("message", async (topic) => {
    if (topic === `homeassistant/started`) {
      publish();
    }
  });
}

module.exports = { handleAutoDiscovery };
