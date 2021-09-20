module.exports = async (reaction, user, bot)=> {
	if(bot.user.id == user.id) return;

	var msg;
	if(reaction.message.partial) msg = await reaction.message.fetch();
	else msg = reaction.message;

	var config;
	if(msg.channel.guild) config = await bot.stores.configs.get(msg.channel.guild.id);
	else config = undefined;

	if(bot.menus?.[msg.id]?.user == user.id) {
		try {
			await bot.menus[msg.id].execute(bot, msg, reaction, user, config);
		} catch(e) {
			console.log(e);
			bot.writeLog(e);
			msg.channel.send("ERR! "+e.message);
		}
	}
}