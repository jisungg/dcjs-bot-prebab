# PROF
**PROF** is an *experimental* bot written in Discord.js v14. 

## Features
- Multi-guild centered
- Profile option using visually appealing backgrounds and profile pictures
- Share profiles and make friends

## Installation
### Requirements
- Node v16 or higher

### Discord Developer Portal
If you haven't already created the application for the bot, redirect to [Discord Developer Portal](https://discord.com/developers/docs/intro):
1. Create an application in the [Applications](https://discord.com/developers/applications) tab.
2. Create a new application and generate a bot token to paste into your `.env` file.
3. Enable all privileged gateway intents.
4. Go to OAuth2 and copy the client ID to paste into your `.env` file.
   1. Replace `CLIENT_ID` to invite your bot to your server: https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=applications.commands%20bot

### MongoDB
1. Log in or register into [Mongo DB](https://www.mongodb.com/).
2. Create a cluster and complete the configuration.
3. Connect to the cluster in your preferred way.
4. Replace `<password>` with your database access password. 
   1. MongoDB should automatically put the username into the connection link, if not, replace `<user>` with the authorized credentials.
5. Past the connection URL into the `.env` file.

The connection link should look something like this: `mongodb+srv://<username>:<password>@clusterName.pjxpv.mongodb.net/MyFirstDatabase?retryWrites=true&w=majority`

### MongoDB Compass
To easily visualize and manage your data, setting up Compass is an easy introduction into using MongoDB databases.
1. Download the latest release of [Compass](https://www.mongodb.com/products/tools/compass).
2. Use the link provided after clicking `Connect` and `I have MongoDB Compass installed.` on the website, and follow the steps.

### `.env`
1. Rename `.env.example` to `.env`.
- After configuration, the `.env` file should look something like this:

```env
TOKEN = SuPerReALToken.BelIeVe_Me_itS_ReaL
MONGO = mongodb+srv://<username>:<password>@clusterName.pjxpv.mongodb.net/MyFirstDatabase?retryWrites=true&w=majority
CLIENT_ID = 521311050193436682
EMOJIS_GUILD_ID = 831236275162972180
```

### Dependencies & Running
1. Open a terminal and run `npm install` or `npm i`.
2. Run `node .`. (for local devices)

## Free Hosting Options
Heroku
   - After the configuration, add the files to a GitHub repository.
   - Log in or register in [Heroku](https://id.heroku.com/login).
   - Create a new app.
   - In the `deploy` section, press `Connect to GitHub`.
   - After connecting, search for the repository and press `connect`.
   - Press **Enable automatic deploys** (optional).
   - Click **Deploy Branch**.
   - Go to the `Resources` section.
   - Disable the `web` type and enable the `worker` type.
