// @ts-check

const { ChannelType } = require("discord.js");

/**
 * CHANNELDELETE event
 * @param {import('../structures/Client').CustomClient} client
 * @param {import('discord.js').GuildChannel} channel
 */
module.exports = async (client, channel) => {
  if (!channel.guild || channel.type !== ChannelType.GuildText) return;

  let guildData = await client.getGuild(channel.guildId);
  let disabledChannels = guildData?.disabledChannels;

  if (!disabledChannels?.includes(channel.id)) return;

  guildData = await client.DBGuild.findByIdAndUpdate(
    channel.guildId,
    { $pull: { disabledChannels: channel.id } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!guildData) {
    client.logger.error(`Unable to fetch and delete channels`, __dirname, {
      tag: "CHANNEL_DELETE",
    });
    return;
  }

  client.guildInfoCache.set(channel.guildId, guildData);
};
