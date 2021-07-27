const Discord		= require("discord.js");
const fs			= require("fs");
const path 			= require("path");

require('dotenv').config();

const bot = new Discord.Client({
	partials: ['MESSAGE', 'USER', 'CHANNEL', 'GUILD_MEMBER', 'REACTION'],
	messageCacheMaxSize: 0,
	messageCacheLifetime: 1,
	messageSweepInterval: 1
});

bot.prefix = process.env.PREFIX;
bot.chars = process.env.CHARS;
bot.invite = process.env.INVITE;

bot.tc = require('tinycolor2');

bot.status = 0;
bot.guildCount = 0;
bot.statuses = [
	() => `ff!h | in ${bot.guilds.cache.size} guilds!`,
	() => `ff!h | serving ${bot.users.cache.size} users!`
	// `ff!h | https://ff.greysdawn.com`
];

bot.updateStatus = async function(){
	var target = bot.statuses[bot.status % bot.statuses.length];
	if(typeof target == "function") bot.user.setActivity(await target());
	else bot.user.setActivity(target);
	bot.status++;
		
	setTimeout(()=> bot.updateStatus(), 60 * 1000) // 5 mins
}

async function setup() {
	bot.db = await require(__dirname + '/../common/stores/__db')(bot);

	files = fs.readdirSync(__dirname + "/events");
	files.forEach(f => bot.on(f.slice(0,-3), (...args) => require(__dirname + "/events/"+f)(...args,bot)));

	bot.utils = require(__dirname + "/utils");
	Object.assign(bot.utils, require(__dirname + "/../common/utils"));

	var data = bot.utils.loadCommands(__dirname + "/../common/commands");
	
	Object.keys(data).forEach(k => bot[k] = data[k]);
}

bot.parseCommand = async function(bot, msg, args) {
	if(!args[0]) return undefined;
	
	var command = bot.commands.get(bot.aliases.get(args[0].toLowerCase()));
	if(!command) return {command, nargs: args};

	args.shift();

	if(args[0] && command.subcommands?.get(command.sub_aliases.get(args[0].toLowerCase()))) {
		command = command.subcommands.get(command.sub_aliases.get(args[0].toLowerCase()));
		args.shift();
	}

	return {command, nargs: args};
}

bot.writeLog = async (log) => {
	let now = new Date();
	let ndt = `${(now.getMonth() + 1).toString().length < 2 ? "0"+ (now.getMonth() + 1) : now.getMonth()+1}.${now.getDate().toString().length < 2 ? "0"+ now.getDate() : now.getDate()}.${now.getFullYear()}`;
	if(!fs.existsSync('./logs')) fs.mkdirSync('./logs');
	if(!fs.existsSync(`./logs/${ndt}.log`)){
		fs.writeFile(`./logs/${ndt}.log`,log+"\r\n",(err)=>{
			if(err) console.log(`Error while attempting to write log ${ndt}\n`+err.stack);
		});
	} else {
		fs.appendFile(`./logs/${ndt}.log`,log+"\r\n",(err)=>{
			if(err) console.log(`Error while attempting to apend to log ${ndt}\n`+err);
		});
	}
}

bot.on("ready", async ()=> {
	console.log('fox ready!');
	bot.updateStatus();
})

bot.on('error', (err)=> {
	console.log(`Error:\n${err.stack}`);
	bot.writeLog(`=====ERROR=====\r\nStack: ${err.stack}`)
})

process.on("unhandledRejection", (e) => console.log(e));

setup();
bot.login(process.env.TOKEN)
.catch(e => console.log("Trouble connecting...\n"+e));
