// @ts-check

const { ActivityType } = require("discord.js");

/**
 * READY event
 * @param {import('../structures/Client').CustomClient} client
 */
module.exports = async (client) => {
  client.user?.setActivity(
    `${client.users.cache.filter((user) => !user.bot).size} profiles!`,
    { type: ActivityType.Watching }
  );

  let allMembers = new Set();
  client.guilds.cache.forEach((guild) => {
    guild.members.cache.forEach((member) => {
      allMembers.add(member.user.id);
    });
  });

  let allChannels = new Set();
  client.logger.log(`Connected into ${client.user?.tag}`, __dirname, {
    tag: "READY",
  });
  client.logger.log(
    `Watching ${client.guilds.cache.size} servers | ${allMembers.size} members | ${allChannels.size} channels`,
    __dirname,
    {
      tag: "DATA",
    }
  );

  // @ts-ignore
  const guild = await client.guilds.fetch(process.env.EMOJIS_GUILD_ID);
  if (guild) {
    await client
      .loadEmotes(guild)
      .then(() => {
        client.logger.log("Loaded emotes successfully.", __dirname, {
          tag: "EMOTES",
        });
      })
      .catch((err) => {
        client.logger.error(
          `Couldn't load emotes\n${err.stack ? err + "\n\n" + err.stack : err}`,
          __dirname,
          { tag: "EMOTES" }
        );
      });
  }
};
