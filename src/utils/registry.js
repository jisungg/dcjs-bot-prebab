// @ts-check

const fs = require("fs").promises;
const path = require("path");

/**
 * @param {import('../structures/Client').CustomClient} client
 * @param  {...String} dirs
 */
async function registerCommands(client, ...dirs) {
  for (const dir of dirs) {
    let files = await fs.readdir(path.join(__dirname, dir));
    for (let file of files) {
      let stat = await fs.lstat(path.join(__dirname, dir, file));
      if (stat.isDirectory()) registerCommands(client, path.join(dir, file));
      else {
        if (file.endsWith(".js")) {
          try {
            /**
             * @type {import('../structures/Client').Command}
             */
            let cmdModule = require(path.join(__dirname, dir, file));
            let { name, aliases, category, execute } = cmdModule;

            if (!name) { 
                client.logger.warn(`The command ${path.join(__dirname, dir, file)} doesn't have a name.`, __dirname);
              continue;
            }

            if (!execute) {
              client.logger.warn(`The command '${name}' doesn't have an execute function.`, __dirname);
              continue;
            }

            if (client.commands.has(name)) {
              client.logger.warn(`The command name '${name}' has already been added.`, __dirname);
              continue;
            }

            client.commands.set(name, cmdModule);

            if (aliases && aliases.length !== 0) {
              aliases.forEach((alias) => {
                if (client.commands.has(alias)) {
                  client.logger.warn(`The command alias '${alias}' has already been added.`, __dirname);
                } else client.commands.set(alias, cmdModule);
              });
            }
            if (category) {
              let commands = client.categories.get(category.toLowerCase());
              if (!commands) commands = [category];
              commands.push(name);
              client.categories.set(category.toLowerCase(), commands);
            } else {
              let commands = client.categories.get("no category");
              if (!commands) commands = ["no category"];
              commands.push(name);
              client.categories.set("no category", commands);
            }
          } catch (e) {
            client.logger.error(`Error loading commands: ${e.message}.`, __dirname);
          }
        }
      }
    }
  }
}

/**
 * @param {import('../structures/Client').CustomClient} client
 * @param  {...String} dirs
 */
async function registerEvents(client, ...dirs) {
  for (const dir of dirs) {
    let files = await fs.readdir(path.join(__dirname, dir));
    for (let file of files) {
      let stat = await fs.lstat(path.join(__dirname, dir, file));
      if (stat.isDirectory()) registerEvents(client, path.join(dir, file));
      else {
        if (file.endsWith(".js")) {
          let eventName = file.substring(0, file.indexOf(".js"));
          try {
            let eventModule = require(path.join(__dirname, dir, file));
            client.on(eventName, eventModule.bind(null, client));
          } catch (e) {
            client.logger.error(`Error loading events: ${e.message}.`, __dirname);
          }
        }
      }
    }
  }
}

module.exports = {
  registerCommands,
  registerEvents,
};
