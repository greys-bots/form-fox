require('dotenv').config();

const {
	Client,
	Intents,
	Options
} = require("discord.js");
const {
	FrameClient,
	Utilities,
	Handlers
} = require('frame');
const fs = require("fs");
const path = require("path");

const bot = new FrameClient({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
	],
	partials: [
		'MESSAGE',
		'USER',
		'CHANNEL',
		'GUILD_MEMBER',
		'REACTION'
	],
	makeCache: Options.cacheWithLimits({
		MessageManager: 0,
		ThreadManager: 0
	})
}, {
	prefix: process.env.PREFIX,
	invite: process.env.INVITE,
	statuses: [
		(bot) => `${bot.prefix}h | in ${bot.guilds.cache.size} guilds!`,
		(bot) => `${bot.prefix}h | serving ${bot.users.cache.size} users!`
	]
});

async function setup() {
	var { db, stores } = await Handlers.DatabaseHandler(bot, __dirname + '/../common/stores');
	bot.db = db;
	bot.stores = stores;

	files = fs.readdirSync(__dirname + "/events");
	files.forEach(f => bot.on(f.slice(0,-3), (...args) => require(__dirname + "/events/"+f)(...args,bot)));

	bot.handlers = {};
	bot.handlers.interaction = Handlers.InteractionHandler(bot, __dirname + '/../common/slashcommands');
	bot.handlers.command = Handlers.CommandHandler(bot, __dirname + '/../common/commands');
	files = fs.readdirSync(__dirname + "/handlers");
	for(var f of files) {
		var n = f.slice(0, -3);
		bot.handlers[n] = require(__dirname + "/handlers/"+f)(bot)
	}

	bot.utils = Utilities;
	var ut = require('./utils');
	bot.utils = Object.assign(bot.utils, ut);
}

bot.on("ready", async ()=> {
	console.log(`Logged in as ${bot.user.tag} (${bot.user.id})`);
})

bot.on('error', (err)=> {
	console.log(`Error:\n${err.stack}`);
})

process.on("unhandledRejection", (e) => console.log(e));

setup()
.then(async () => {
	try {
		await bot.login(process.env.TOKEN);
	} catch(e) {
		console.log("Trouble connecting...\n"+e)
	}
})
.catch(e => console.log(e))