// @ts-check

const { ChannelType, Collection } = require('discord.js');

const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * MESSAGECREATE event
 * @param {import('../structures/Client').CustomClient} client 
 * @param {import('discord.js').Message} message 
 */
module.exports = async (client, message) => {
    try {
        if (message.author.bot || message.channel.type !== ChannelType.GuildText || client.blacklistCache.has(message.author.id)) return;

        const messageGuildID = message.guildId;
        if (!messageGuildID) {
            client.logger.error(`Error fetching message guild ID.`, __dirname, { tag: "MESSAGE_CREATE"});
            return;
        }
        let guildData = await client.getGuild(messageGuildID);
        
        const prefixRegex = new RegExp(`^(<@!?${client.user?.id}>|${escapeRegex(guildData?.prefix)})\\s*`);
        if (!prefixRegex.test(message.content)) return;

        const matchResults = message.content.match(prefixRegex);
        if (matchResults) {
            const [, matchedPrefix]= matchResults;
            let msgargs = message.content.slice(matchedPrefix.length).trim().split(/ +/);
            let cmdName = msgargs.shift()?.toLowerCase();

            if (!cmdName) {
                client.logger.error(`Could not fetch command name from RegExp.`, __dirname, { tag: "MESSAGE_CREATE"});
                return;
            }

            const command = client.commands.get(cmdName) || (guildData?.commandAlias ? client.commands.get(guildData.commandAlias[cmdName]) : false);
            
            if (!command) return;

            if (guildData?.disabledChannels?.includes(command.name)) return;
            if (guildData?.disabledChannels?.includes(message.channel.id)) return;

            const me = message.guild?.members.me;
            const member = message.member;
            if (!me || !member) {
                client.logger.error(`Error fetching message members: ${messageGuildID}.`, __dirname, { tag: "MESSAGE_CREATE"});
                return;
            }

            //@ts-ignore
            if (command.clientPerms && !message.channel.permissionsFor(me).has(command.clientPerms, true)) return message.channel.send(`${message.author.username}, you are missing the following permissions: ${client.utils.missingPermissions(member, guildData?.commandPerms[command.name])}`);

            if (guildData?.commandPerms && guildData.commandPerms[command.name] && !member.permissions.has(guildData.commandPerms[command.name], true)) return message.channel.send(`${message.author.username}, you are missing the following permissions: ${client.utils.missingPermissions(member, guildData.commandPerms[command.name])}`);
            else if (command.perms && !member.permissions.has(command.perms), true) {
                const permsArr = command.perms?.toArray();
                if (!permsArr) {
                    client.logger.error(`Error fetching permissions from command`, __dirname, { tag: "MESSAGE_CREATE"});
                    return;
                }
                return message.channel.send(`${message.author.username}, you are missing the following permissions: ${client.utils.missingPermissions(message.member, permsArr)}`);
            }

            const cd = await client.getCooldown(command, message);

            let cooldowns;
            if (cd) {
                if (typeof command.globalCooldown === 'undefined' || command.globalCooldown) {
                    if (!client.gloablCooldowns.has(command.name)) client.gloablCooldowns.set(command.name, new Collection());
                    cooldowns = client.gloablCooldowns;
                } else {
                    if (!client.serverCooldowns.has(messageGuildID)) client.serverCooldowns.set(messageGuildID, new Collection());
                    cooldowns = client.serverCooldowns.get(messageGuildID);
                    if (typeof cooldowns === 'undefined') {
                        client.logger.error(`Error fetching type of cooldown [ SERVER, GLOBAL ] from ${command.name}.`, __dirname, { tag: "COOLDOWN"});
                        return;
                    }
                    if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Collection());
                }

                const now = Date.now();
                const timestamps = cooldowns.get(command.name);
                const cooldownAmount = cd * 1000;
                if (typeof timestamps !== 'undefined' && timestamps.has(message.author.id)) {
                    // @ts-ignore
                    const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
                    if (now < expirationTime) return message.channel.send(`${message.author.username}, please wait \`${client.utils.msToTime(expirationTime - now)}\` before using this command again.`);
                }
            }

            let flags;
            if (command.arguments) flags = client.processArguments(message, msgargs, command.arguments);
            if (flags && flags.invalid) {
                if (flags.prompt) return message.channel.send(flags.prompt);
                return;
            }

            //@ts-ignore
            command.execute({ client: client, message: message, args: msgargs, flags: flags});            
        } else {
            client.logger.error(`Could not match message content to RegExp.`, __dirname, { tag: "MESSAGE_CREATE"});
            return;
        }
    } catch (e) {
        client.logger.error(`Error handling messages: ${e.message}`, __dirname, { tag: "MESSAGE_CREATE"});
    }
}