const { Schema, model } = require("mongoose");
const DEFAULT_PREFIX = require("../../config/config.json").defaultPrefix;

const guildSchema = Schema(
  {
    _id: String,
    prefix: {
      default: DEFAULT_PREFIX,
      type: String,
    },
    disabledCommands: Array,
    disabledChannels: Array,
    commandCooldowns: {},
  },
  { versionKey: false }
);

module.exports = model("guildSchema", guildSchema);
