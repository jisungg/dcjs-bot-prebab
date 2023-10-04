// @ts-check

const { EmbedBuilder } = require("discord.js");
const { embedColor } = require("../../config/config.json");

module.exports = class Util {
  /**
   * Get all missing permissions of a GuildMember
   * @param {import('discord.js').GuildMember} member - The guild member to check for missing permissions
   * @param {import('discord.js').PermissionsString[]} perms  - The permissions to check
   * @returns {string | void} Readable string containing all missing permissions
   */
  static missingPermissions(member, perms) {
    const missingPerms = member.permissions.missing(perms).map((str) => {
      `\`${str
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b(\w)/g, (char) => char.toUpperCase())}\``;
    });
    return missingPerms.length > 1
      ? `${missingPerms.slice(0, -1).join(", ")} and ${
          missingPerms.slice(-1)[0]
        }`
      : missingPerms[0];
  }

  /**
   * Function to convert milliseconds into readable time
   * @param {number} ms - The time in
   * @returns {string} Readable time as a string
   */
  static msToTime(ms) {
    let time = "";

    let n = 0;
    if (ms >= 31536000000) {
      n = Math.floor(ms / 31536000000);
      time = `${n}y `;
      ms -= n * 31536000000;
    }

    if (ms >= 2592000000) {
      n = Math.floor(ms / 2592000000);
      time += `${n}mo `;
      ms -= n * 2592000000;
    }

    if (ms >= 604800000) {
      n = Math.floor(ms / 604800000);
      time += `${n}w `;
      ms -= n * 604800000;
    }

    if (ms >= 86400000) {
      n = Math.floor(ms / 86400000);
      time += `${n}d `;
      ms -= n * 86400000;
    }

    if (ms >= 3600000) {
      n = Math.floor(ms / 3600000);
      time += `${n}h `;
      ms -= n * 3600000;
    }

    if (ms >= 60000) {
      n = Math.floor(ms / 60000);
      time += `${n}m `;
      ms -= n * 60000;
    }

    n = Math.ceil(ms / 1000);
    time += n === 0 ? "" : `${n}s`;

    return time.trimEnd();
  }
};
