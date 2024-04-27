require('dotenv').config();

const {
	Client,
	GatewayIntentBits: Intents,
	Partials,
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
		Intents.Guilds,
		Intents.GuildMessages,
		Intents.GuildMessageReactions,
		Intents.GuildMembers,
		Intents.DirectMessages,
		Intents.DirectMessageReactions
	],
	partials: [
		Partials.Message,
		Partials.User,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Reaction
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
	],
	warning: (
		`‼️ **Update: Hosting Goal Met!** ‼️\n` +
		`We're no longer worried about shutting down!\n` +
		`Check out [this post](<https://greysdawn.com/blog/hosting-met>) for more info ` +
		`and a look at future goals`
	)
});

async function setup() {
	var { db, stores } = await Handlers.DatabaseHandler(bot, __dirname + '/../common/stores');
	bot.db = db;
	bot.stores = stores;

	files = fs.readdirSync(__dirname + "/events");
	files.forEach(f => bot.on(f.slice(0,-3), (...args) => require(__dirname + "/events/"+f)(...args,bot)));

	bot.handlers = {};
	bot.handlers.interaction = Handlers.InteractionHandler(bot, __dirname + '/../common/slashcommands');
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