const { App } = require("@slack/bolt");
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();


// Initialize Slack App with Socket Mode
const slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
});

// Initialize Discord Bot
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
});

discordClient.once("ready", () => {
    console.log(`Logged into Discord as ${discordClient.user.tag}`);
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);

// Slack Message Event Listener
slackApp.event("message", async ({ event, client }) => {
    try {
        if ((!event.text && !event.files)
            || event.subtype === "bot_message"
            || event.bot_id
            || event.channel !== process.env.SLACK_CHANNEL_ID) return;

        const userInfo = await client.users.info({ user: event.user });
        const username = userInfo.user.real_name || userInfo.user.name;
        const message = event.text || "";

        let fileLinks = "";
        if (event.files && event.files.length > 0) {
            console.log("start link compile");
            fileLinks = event.files.map((file) => file.url_private).join("\n");
            console.log("file link compiled");
        }

        const discordChannel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
        if (discordChannel.isTextBased()) {
            await discordChannel.send(`**${username}**: ${message}\n${fileLinks}`);
        }
    } catch (error) {
        console.error("Error handling Slack event:", error);
    }
});

// Discord Message Event Listener
discordClient.on("messageCreate", async (message) => {
    try {
        //if (message.author.bot) return; // Ignore bot messages
        if (message.author.id === discordClient.user.id
        || message.channel.id !== process.env.DISCORD_CHANNEL_ID) return; // Ignore only this bot's messages

        const username = message.member?.displayName || message.author.username;
        let text = `*${username}*: ${message.content}`;
        if (message.attachments.size > 0) {
            const attachmentLinks = [...message.attachments.values()].map(att => att.url).join("\n");
            text += `\n${attachmentLinks}`;
        }

        await slackApp.client.chat.postMessage({
            channel: process.env.SLACK_CHANNEL_ID,
            text,
        });
    } catch (error) {
        console.error("Error forwarding Discord message to Slack:", error);
    }
});

// Start Slack App
(async () => {
    await slackApp.start();
    console.log("Slack bot is running in Socket Mode!");
})();
