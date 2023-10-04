// @ts-check

const { defaultPrefix } = require("../../config/config.json");

/**
 * GUILDCREATE event
 * @param {import('../structures/Client').CustomClient} client
 * @param {import('discord.js').Guild} guild
 */
module.exports = async (client, guild) => {
  const guildOwner = await guild.fetchOwner();
  guildOwner.send(
    `Thanks for adding me to ${guild.name}! My default prefix is '**${defaultPrefix}**'.`
  );
};
