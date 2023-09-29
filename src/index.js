// @ts-check

require("dotenv").config();

const { CustomClient } = require("./structures/Client");
const { registerCommands, registerEvents } = require("./utils/registry");
const ON_DEATH = require("death");

const client = new CustomClient();

(async () => {
  /*  REGISTER COMMANDS & EVENTS  */
  try {
    await registerEvents(client, "../events");
  } catch (e) {
    client.logger.error(`Error loading events: ${e.message}.`);
  }
  try {
    await registerCommands(client, "../commands");
  } catch (e) {
    client.logger.error(`Error loading commands: ${e.message}.`);
  }

  /*  DATABASE/MONGOOSE  */
  try {
    await client.loadDatabase();
    await client.blacklistFetch();
    client.logger.log(`Connected to the database.`, __dirname, {
      tag: "DATABASE",
    });
  } catch (e) {
    client.logger.error(
      `Error connecting to the database: ${e.message}`,
      __dirname
    );
    process.exit(1);
  }

  /*  CLIENT LOGIN  */
  try {
    await client.login(process.env.TOKEN);
    client.logger.log(`Logged in as ${client.user?.tag}.`, __dirname, {
      tag: "CLIENT",
    });
  } catch (e) {
    client.logger.error(`Error logging in: ${e.message}.`);
  }
})();

ON_DEATH(async (SIGINT) => {
    await client.destroy();
    client.logger.log(`The server has been stopped.`, __dirname, {
        tag: "SHUTDOWN",
      });
      setTimeout(() => process.exit(0), 1000);
});
