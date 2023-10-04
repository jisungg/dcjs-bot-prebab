// @ts-check

const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Snowflake,
} = require("discord.js");
const { Connection, Model, connect, connection, set } = require("mongoose");
const db = connection;

const Logger = require("../utils/logger");
const Util = require("../utils/utils");

/**
 * @class CustomClient
 * @extends {Client}
 */
class CustomClient extends Client {
  constructor() {
    super({
      // @ts-ignore
      intents: [Object.keys(GatewayIntentBits)],
      partials: [Partials.Message, Partials.Reaction],
      allowedMentions: {
        parse: ["roles", "users"],
        repliedUser: false,
      },
    });
    /*  COMMANDS  */
    /**
     * A collection containing all commands
     * @type {import('discord.js').Collection<Snowflake, Command>}
     */
    this.commands = new Collection();
    /**
     * A collection containing all categories and the commands inside that category
     * @type {import('discord.js').Collection<Snowflake, string[]>}
     */
    this.categories = new Collection();

    /*  DATABASE  */
    /**
     * A collection containing all cached guildInfo
     * @type {import('discord.js').Collection<Snowflake, guildInfo>}
     */
    this.guildInfoCache = new Collection();
    /**
     * A collection containing all cached userInfo
     * @type {import('discord.js').Collection<Snowflake, userInfo>}
     */
    this.userInfoCache = new Collection();
    /**
     * A set containing all Discord IDs of blacklisted users
     * @type {Set<Snowflake>}
     */
    this.blacklistCache = new Set();
    /**
     * A reference to the guildSchema
     * @type {Model<guildInfo>}
     */
    this.DBGuild = require("../schemas/guildSchema");
    /**
     * A reference to the guildSchema
     * @type {Model<userInfo>}
     */
    this.DBUser = require("../schemas/userSchema");
    /**
     * A reference to the config schema
     * @type {Model<{}>}
     */
    this.DBConfig = require("../schemas/config");

    /*  EMOJIS  */
    /**
     * A collection of emojis
     * @type {Collection<Snowflake>}
     */
    this.emotes = new Collection();

    /*  COOLDOWNS  */
    /**
     * A collection containing all stored server cooldowns
     * @type {import('discord.js').Collection<Snowflake, Collection<string, Collection<Snowflake, number>>>}
     */
    this.serverCooldowns = new Collection();
    /**
     * A collection containing all stored global cooldowns
     * @type {import('discord.js').Collection<string, Collection<Snowflake, number>>}
     */
    this.gloablCooldowns = new Collection();

    /*  UTILS  */
    this.logger = Logger;
    this.utils = Util;

    /*  DB CONNECTION  */

    db.on("connected", async () => {
      this.logger.log(
        `Successfully connected to the database! (Latency: ${Math.round(
          await this.databasePing()
        )}ms)`,
        __dirname,
        { tag: "DATABASE" }
      );
    });
    db.on("disconnected", () =>
      this.logger.error("Disconnected from the database!", __dirname, {
        tag: "DATABASE",
      })
    );
    db.on("error", (error) =>
      this.logger.error(
        `Unable to connect to the database!\n${
          error.stack ? error + "\n\n" + error.stack : error
        }`,
        __dirname,
        {
          tag: "DATABASE",
        }
      )
    );
    db.on("reconnected", async () =>
      this.logger.log(
        `Reconnected to the database! (Latency: ${Math.round(
          await this.databasePing()
        )}ms)`,
        __dirname,
        { tag: "DATABASE" }
      )
    );
  }

  /*  DATABASE/MONGOOSE FUNCTIONS */
  /**
   * Get Guild Information
   * @param {String} guildID
   */
  async getGuild(guildID) {
    let guildData = this.guildInfoCache.get(guildID);
    if (!guildData) {
      guildData = await this.DBGuild.findByIdAndUpdate(
        guildID,
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      // @ts-ignore
      this.guildInfoCache.set(guildID, guildData);
    }
    return guildData;
  }

  /**
   * Get User Information
   * @param {String} userID
   */
  async getUser(userID) {
    let userData = this.userInfoCache.get(userID);
    if (!userData) {
      userData = await this.DBUser.findByIdAndUpdate(
        userID,
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      // @ts-ignore
      this.userInfoCache.set(userID, userData);
    }
    return userData;
  }

  /**
   * @returns {Promise<Connection>}
   */
  loadDatabase() {
    set("strictQuery", true);
    // @ts-ignore
    return connect(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  /**
   * Fetches the blacklist
   */
  async blacklistFetch() {
    const blacklist = await this.DBConfig.findByIdAndUpdate(
      "blacklist",
      {},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).then((doc) => {
      return JSON.parse(JSON.stringify(doc));
    });
    this.blacklistCache = new Set(blacklist.blacklisted);
  }

  /**
   * @returns {Promise<Number>}
   */
  async databasePing() {
    const cNano = process.hrtime();
    await db.db.command({ ping: 1 });
    const time = process.hrtime(cNano);
    return time[0] * 1e9 + time[1] * 1e-6;
  }

  /*  EMOTES FUNCTION  */
  /**
   * @param {import('discord.js').Guild} guild
   */
  async loadEmotes(guild) {
    if (guild) {
      let emotesArr = [];
      await guild.emojis.fetch().then((emojis) => {
        emotesArr = [];
        emojis.forEach((e) => {
          emotesArr = emotesArr.reduce((acc, curr) => {
            if (curr !== e.name) acc.push(curr);
            return acc;
          }, []);
          if (e.name === null) return;
          if (e.name.includes("_")) {
            let name = e.name.replace("_", "-");
            if (e.animated) {
              this.emotes.set(name, `<${e.identifier}>`);
            } else {
              this.emotes.set(name, `<:${e.identifier}>`);
            }
          } else {
            if (e.animated) {
              this.emotes.set(e.name, `<${e.identifier}>`);
            } else {
              this.emotes.set(e.name, `<:${e.identifier}>`);
            }
          }
        });
      });
    }
  }

  /*  COOLDOWNS  */
  /**
   * @param {import('../structures/client').Command} command - The command to set a cooldown for
   * @param {import('discord.js').Message} message - the message in the guild the command is executed from
   * @returns {number | undefined}
   */
  getCooldown(command, message) {
    const guildID = message.guildId;
    if (!guildID) {
      this.logger.warn(
        `Wasn't able to get cooldown due to error fetching guild ID from message.`,
        __dirname,
        { tag: "COOLDOWN" }
      );
      return;
    }
    const guildData = this.guildInfoCache.get(guildID);
    let cd = command.cooldown;

    if (
      guildData?.commandCooldowns &&
      guildData.commandCooldowns[command.name]
    ) {
      let roles = Object.keys(guildData.commandCooldowns[command.name]);
      let highestRole = message.member?.roles.cache
        .filter((role) => roles.includes(role.id))
        .sort((a, b) => b.position - a.position)
        .first();
      if (highestRole)
        cd = guildData.commandCooldowns[command.name][highestRole.id] / 1000;
    }

    return cd;
  }

  /**
   * @param {import('../structures/Client').Command} command
   * @param {import('discord.js').Message} message
   */
  async setCooldown(command, message) {
    const cd = await this.getCooldown(command, message);

    if (!cd) return;

    let cooldowns;
    if (
      typeof command.globalCooldown === "undefined" ||
      command.globalCooldown
    ) {
      if (!this.gloablCooldowns.has(command.name))
        this.gloablCooldowns.set(command.name, new Collection());
      cooldowns = this.gloablCooldowns;
    } else {
      const guildID = message.guildId;
      if (!guildID) {
        this.logger.error(
          `Error setting cooldowns for command: ${command.name}.`,
          __dirname,
          { tag: "COOLDOWN" }
        );
        return;
      }
      if (!this.serverCooldowns.has(guildID))
        this.serverCooldowns.set(guildID, new Collection());
      cooldowns = this.serverCooldowns.get(guildID);
      if (!cooldowns) {
        this.logger.error(
          `Error fetching server cooldowns for guild: ${guildID}.`,
          __dirname,
          { tag: "COOLDOWN" }
        );
        return;
      }
      if (!cooldowns.has(command.name))
        cooldowns.set(command.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = cd * 1000;

    if (!timestamps) {
      this.logger.error(
        `Error getting cooldowns from command: ${command.name}.`,
        __dirname,
        { tag: "COOLDOWN" }
      );
      return;
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  }

  /*  COMMAND HANDLING  */
  /**
   * Check if the user has passed in the proper arguments for a command
   * @param {import('discord.js').Message} message
   * @param {string[]} msgArgs - The arguments given by the user
   * @param {Arguments} expectedArgs - The expected arguments for the command
   * @returns {Flags} The arguments mapped by their ID's if all the arguments were as expected, else, returns `undefined/false`
   */
  processArguments(message, msgArgs, expectedArgs) {
    let counter = 0;
    let amount, num, role, member, channel, attach, time;
    let flags = {};

    for (const argument of expectedArgs) {
      //@ts-ignore
      amount = argument.amount && argument.amount > 1 ? argument.amount : 1;

      for (let i = 0; i < amount; i++) {
        if (!msgArgs[counter] && argument.type !== "ATTACHMENT") {
          //@ts-ignore
          if (argument.optional) return flags;
          //@ts-ignore
          return { invalid: true, prompt: argument.prompt };
        }

        switch (argument.type) {
          case "SOMETHING":
            if (
              argument.words &&
              !argument.words.includes(msgArgs[counter].toLowerCase())
            )
              return { invalid: true, prompt: argument.prompt };
            else if (argument.regexp && !argument.regexp.test(msgArgs[counter]))
              return { invalid: true, prompt: argument.prompt };

            if (amount == 1) flags[argument.id] = msgArgs[counter];
            else if (flags[argument.id])
              flags[argument.id].push(msgArgs[counter]);
            else flags[argument.id] = [msgArgs[counter]];
            break;

          case "NUMBER":
            num = Number(msgArgs[counter]);
            if (isNaN(num)) return { invalid: true, prompt: argument.prompt };

            if (argument.min && argument.min > num)
              return { invalid: true, prompt: argument.prompt };

            if (argument.max && argument.max < num)
              return { invalid: true, prompt: argument.prompt };

            //@ts-ignore
            if (argument.toInteger) num = parseInt(num);

            if (amount == 1) flags[argument.id] = num;
            else if (flags[argument.id]) flags[argument.id].push(num);
            else flags[argument.id] = [num];
            break;

          case "CHANNEL":
            // @ts-ignore
            if (
              msgArgs[counter].startsWith("<#") &&
              msgArgs[counter].endsWith(">")
            )
              // @ts-ignore
              channel = message.guild.channels.cache.get(
                msgArgs[counter].slice(2, -1)
              );
            // @ts-ignore
            else channel = message.guild.channels.cache.get(msgArgs[counter]);

            if (!channel) return { invalid: true, prompt: argument.prompt };

            // @ts-ignore
            if (
              argument.channelTypes &&
              // @ts-ignore
              !argument.channelTypes.includes(channel.type)
            )
              return { invalid: true, prompt: argument.prompt };

            if (amount == 1) flags[argument.id] = channel;
            else if (flags[argument.id]) flags[argument.id].push(channel);
            else flags[argument.id] = [channel];
            break;

          case "ROLE":
            // @ts-ignore
            if (
              msgArgs[counter].startsWith("<@&") &&
              msgArgs[counter].endsWith(">")
            )
              // @ts-ignore
              role = message.guild.roles.cache.get(
                msgArgs[counter].slice(3, -1)
              );
            // @ts-ignore
            else role = message.guild.roles.cache.get(msgArgs[counter]);

            if (!role) return { invalid: true, prompt: argument.prompt };

            if (argument.notBot && role.managed)
              return { invalid: true, prompt: argument.prompt };

            if (amount == 1) flags[argument.id] = role;
            else if (flags[argument.id]) flags[argument.id].push(role);
            else flags[argument.id] = [role];
            break;

          case "AUTHOR_OR_MEMBER":
            // @ts-ignore
            if (
              msgArgs[counter] &&
              (msgArgs[counter].startsWith("<@") ||
                (msgArgs[counter].startsWith("<@!") &&
                  msgArgs[counter].endsWith(">")))
            )
              // @ts-ignore
              member = message.guild.member(
                msgArgs[counter]
                  .replace("<@", "")
                  .replace("!", "")
                  .replace(">", "")
              );
            // @ts-ignore
            else member = message.guild.member(msgArgs[counter]);

            if (!member) flags[argument.id] = message.member;
            else flags[argument.id] = member;

            if (argument.toUser) flags[argument.id] = flags[argument.id].user;
            break;

          case "MEMBER":
            // @ts-ignore
            if (
              msgArgs[counter].startsWith("<@") ||
              (msgArgs[counter].startsWith("<@!") &&
                msgArgs[counter].endsWith(">"))
            )
              // @ts-ignore
              member = message.guild.member(
                msgArgs[counter]
                  .replace("<@", "")
                  .replace("!", "")
                  .replace(">", "")
              );
            // @ts-ignore
            else member = message.guild.member(msgArgs[counter]);

            if (!member) return { invalid: true, prompt: argument.prompt };
            else {
              if (argument.notBot && member.user.bot)
                return { invalid: true, prompt: argument.prompt };

              if (argument.notSelf && member.id === message.author.id)
                return { invalid: true, prompt: argument.prompt };

              if (argument.toUser) member = member.user;

              if (amount == 1) flags[argument.id] = member;
              else if (flags[argument.id]) flags[argument.id].push(member);
              else flags[argument.id] = [member];
            }
            break;

          case "ATTACHMENT":
            if (message.attachments.size === 0)
              return { invalid: true, prompt: argument.prompt };

            attach = message.attachments.filter((a) => {
              let accepted = false;

              argument.attachmentTypes.forEach((type) => {
                if (a.proxyURL.endsWith(type)) accepted = true;
              });

              return accepted;
            });

            if (attach.size === 0 && argument.optional) return flags;
            else if (attach.size === 0)
              return { invalid: true, prompt: argument.prompt };

            flags[argument.id] = attach.first();
            break;

          case "TIME":
            time = msgArgs
              .slice(counter)
              .join("")
              .match(/(\d*)(\D*)/g);
            // @ts-ignore
            time.pop();

            num = 0;
            // @ts-ignore
            for (let i = 0; i < time.length; i++) {
              try {
                // @ts-ignore
                num += ms(time[i]);
              } catch (e) {
                return { invalid: true, prompt: argument.prompt };
              }
            }

            if (argument.min && num < argument.min)
              return { invalid: true, prompt: argument.prompt };

            if (argument.max && num > argument.max)
              return { invalid: true, prompt: argument.prompt };

            flags[argument.id] = num;
            break;

          default:
            this.logger.warn(
              //@ts-ignore
              `processArguments: the argument type '${argument.type}' doesn't exist.`,
              __dirname,
              { tag: "PROCESS_ARGUMENTS" }
            );
        }

        counter++;
      }
    }
    return flags;
  }
}

/**
 * @typedef guildInfo
 * @type { object }
 * @property { string } _id - Guild ID
 * @property { string } prefix - Bot Prefix
 * @property { string[] } [disabledCommands] - Array with all disabled command names
 * @property { string[] } [disabledChannels] - Array with all channel ID's that are disabled
 * @property { Object.<string, import('discord.js').PermissionsString[]> } [commandPerms] - Contains all the custom command perms for a command
 * @property { Object.<string, Object.<string, number>> }[commandCooldowns] - Contains all the custom role cooldowns for a command
 * @property { Object.<string, string> } [commandAlias] - Contains all the custom command aliases: { alias: commandName }
 */

/**
 * @typedef userInfo
 * @type { object }
 * @property { string } _id - User ID
 * @property { string[] } [followers] - Array of Users following the user
 * @property { string[] } [following] - Array of Users that the user is following
 */

/**
 * @typedef Arguments
 * @type {Array.<SomethingArgument|NumberArgument|ChannelArgument|RoleArgument|AuthorOrMemberArgument|MemberArgument|AttachmentArgument|TimeArgument>}
 */

/**
 * @typedef Flags
 * @type {Object.<string, *>}
 */

/**
 * @typedef SomethingArgument
 * @type {object}
 * @property {'SOMETHING'} type - The user argument can be anything, maybe a word or a URL - anything
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {number} [amount] - The amount of arguments
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {string[]} [words] - An array of words that the user can send
 * @property {RegExp} [regexp] - The user argument should match this regular expression
 */

/**
 * @typedef NumberArgument
 * @type {object}
 * @property {'NUMBER'} type - The user argument has to be a number and will automatically be converted into a number
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {number} [amount] - The amount of arguments
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {number} [min] - The minimum that the number can be
 * @property {number} [max] - The maximum that the number can be
 * @property {boolean} [toInteger] - Whether the number should be converted into an integer
 */

/**
 * @typedef ChannelArgument
 * @type {object}
 * @property {'CHANNEL'} type - The user argument has to be a channel and will automatically be converted into a channel
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {number} [amount] - The amount of arguments
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {('text'|'voice'|'category'|'news'|'store')[]} [channelTypes] - The channel types that the provided channel can be
 */

/**
 * @typedef RoleArgument
 * @type {object}
 * @property {'ROLE'} type - The user argument has to be a role and will automatically be converted into a role
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {number} [amount] - The amount of arguments
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {boolean} [notBot] - The role shouldn't be the default role of a bot
 */

/**
 * @typedef AuthorOrMemberArgument
 * @type {object}
 * @property {'AUTHOR_OR_MEMBER'} type - If the user mentions someone, it will get the mentioned member, otherwise it will be the message member
 * @property {string} id - The ID of this argument
 * @property {boolean} [toUser] - Whether or not the member should be converted into the User object
 */

/**
 * @typedef MemberArgument
 * @type {object}
 * @property {'MEMBER'} type - The user argument has to be a member and will automatically be converted into a member
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {number} [amount] - The amount of arguments
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {boolean} [notBot] - The member shouldn't be a bot
 * @property {boolean} [notSelf] - The member shouldn't be the command user
 * @property {boolean} [toUser] - Whether or not the member should be converted into the User object
 */

/**
 * @typedef AttachmentArgument
 * @type {object}
 * @property {'ATTACHMENT'} type - The message has to have an attachment
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {string[]} attachmentTypes - The accepted attachment types
 */

/**
 * @typedef TimeArgument
 * @type {object}
 * @property {'TIME'} type - The user argument has to be time and will automatically be converted into milliseconds
 * @property {string} id - The ID of this argument
 * @property {boolean} [optional] - Whether this argument is optional
 * @property {string} [prompt] - The message to send if the user doesn't provide the correct arguments
 * @property {number} [min] - The minimum time they should provide in milliseconds
 * @property {number} [max] - The maximum time they can provide in milliseconds
 */

/**
 * @typedef ExecuteFunctionParameters
 * @property {Client} ExecuteFunctionParameters.client - The client instance
 * @property {import('discord.js').Message} ExecuteFunctionParameters.message - The message sent by the user
 * @property {string[]} ExecuteFunctionParameters.args - The message arguments
 * @property {Flags} ExecuteFunctionParameters.flags - The processed arguments mapped by their ID
 */

/**
 * @callback ExecuteFunction
 * @param {ExecuteFunctionParameters} ExecuteFunctionParameters
 */

/**
 * @typedef Command
 * @type {object}
 * @property {string} name - The name of the command
 * @property {string[]} [aliases=[]] - Aliases for this command
 * @property {string} [category='No category'] - The category of this command, default is 'No category'
 * @property {string} [description=''] - Description of the command
 * @property {string} [usage=''] - Usage information of the command
 * @property {string} [examples=''] - Examples to further explain the usage of the command
 * @property {number} [cooldown=0] - Cooldown of the command
 * @property {boolean} [globalCooldown=true] - Whether the cooldown on this command will be globally or for a server only
 * @property {boolean} [canNotDisable=false] - Whether or not this command can be disabled in a server
 * @property {import('discord.js').PermissionsBitField} [perms=[]] - Permissions that the user needs in order to use this command [PermissionsBitField.Flags]
 * @property {import('discord.js').PermissionsBitField} [clientPerms=[]] - Permissions that the client needs to run this command [PermissionsBitField.Flags]
 * @property {Arguments} [arguments=[]] - Arguments that the user should provide
 * @property {ExecuteFunction} execute - The function that will be ran when someone successfully uses a command
 */

module.exports = { CustomClient };
