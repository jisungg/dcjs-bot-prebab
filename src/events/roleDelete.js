// @ts-check

/**
 * ROLEDELETE event
 * @param {import('../structures/Client').CustomClient} client
 * @param {import('discord.js').Role} role
 */
module.exports = async (client, role) => {
  let guildData = await client.getGuild(role.guild.id);
  if (!guildData) {
    client.logger.error(`Error retreiving guild data.`, __dirname, {
      tag: "ROLE_DELETE",
    });
    return;
  }
  let commandCooldowns = guildData.commandCooldowns || {};
  let update = false;

  for (const command of Object.keys(commandCooldowns)) {
    if (!commandCooldowns[command][role.id]) continue;

    update = true;
    delete commandCooldowns[command][role.id];

    if (Object.keys(commandCooldowns[command]).length === 0)
      delete commandCooldowns[command];
  }

  if (!update) return;

  guildData = await client.DBGuild.findByIdAndUpdate(
    role.guild.id,
    { $set: { commandCooldowns: commandCooldowns } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (!guildData) {
    client.logger.error(`Error updating guild database.`, __dirname, {
      tag: "ROLE_DELETE",
    });
    return;
  }
  client.guildInfoCache.set(role.guild.id, guildData);
};
