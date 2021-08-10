const WELCOMES = [
	"You're welcome!",
	"You're welcome! :fox:",
	"Of course!!",
	":D !!",
	"Eee! :orange_heart: :fox:"
];

module.exports = async (msg, bot)=>{
	if(msg.author.bot) return;
	var config = await bot.stores.configs.get(msg.channel.guild?.id);
	var prefix = config?.prefix ? config.prefix : bot.prefix;
	if(!msg.content.toLowerCase().startsWith(prefix)) {
		var thanks = msg.content.match(/^(thanks? ?(you|u)?|ty),? ?(form )?fox/i);
		if(thanks) return await msg.channel.send(WELCOMES[Math.floor(Math.random() * WELCOMES.length)]);
		return;
	}
	if(msg.content.toLowerCase() == prefix) return msg.channel.send("Eee!");
	
	var log = [
		`Guild: ${msg.channel.guild?.name || "DMs"} (${msg.channel.guild?.id || msg.channel.id})`,
		`User: ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`,
		`Message: ${msg.content}`,
		`--------------------`
	];

	let {command, args} = await bot.handlers.command.parse(msg.content.replace(prefix, ""));
	if(!command) {
		log.push('- Command not found -');
		console.log(log.join('\r\n'));
		bot.writeLog(log.join('\r\n'));
		return await msg.channel.send("Command not found!");
	}

	// if(msg.channel.guild) {
		// var usages = {whitelist: [], blacklist: []};
		// usages = await bot.stores.usages.get(msg.channel.guild.id);
	// }

	// if(usages && !msg.member.permissions.has('MANAGE_MESSAGES')) {
	// 	switch(usages.type) {
	// 		case 1:
	// 			if(!usages.whitelist.includes(msg.author.id) &&
	// 			   !usages.whitelist.find(x => msg.member.roles.cache.has(x)))
	// 				return await msg.channel.send("You have not been whitelisted to use this bot!");
	// 			break;
	// 		case 2:
	// 			if(usages.blacklist.includes(msg.author.id) ||
	// 			   usages.blacklist.find(x => msg.member.roles.cache.has(x)))
	// 				return await msg.channel.send("You have been blacklisted from using this bot!");
	// 			break;
	// 	}
	// }
	
	try {
		var result = await bot.handlers.command.handle({command, args, msg, config});
	} catch(e) {
		console.log(e.stack);
		log.push(`Error: ${e.stack}`);
		log.push(`--------------------`);
		msg.channel.send('There was an error!')
	}
	console.log(log.join('\r\n'));
	bot.writeLog(log.join('\r\n'));
	
	if(!result) return;
	if(Array.isArray(result)) { //embeds
		var message = await msg.channel.send({embeds: [result[0].embed ?? result[0]]});
		if(result[1]) {
			if(!bot.menus) bot.menus = {};
			bot.menus[message.id] = {
				user: msg.author.id,
				data: result,
				index: 0,
				timeout: setTimeout(()=> {
					if(!bot.menus[message.id]) return;
					try {
						message.reactions.removeAll();
					} catch(e) {
						console.log(e);
					}
					delete bot.menus[message.id];
				}, 900000),
				execute: bot.utils.paginateEmbeds
			};
			["⬅️", "➡️", "⏹️"].forEach(r => message.react(r));
		}
	} else if(typeof result == "object") await msg.channel.send({embeds: [result.embed ?? result]});
	else await msg.channel.send(result);
}