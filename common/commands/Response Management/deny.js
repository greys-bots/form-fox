module.exports = {
	help: ()=> "Manually deny a response, in case reactions aren't working",
	usage: ()=> [' [response ID] - Manually denies the response with the given ID'],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a response to deny!';

		var response = await bot.stores.responses.get(msg.guild.id, args[0].toLowerCase());
		if(!response) return 'Response not found!';

		var user = await bot.users.fetch(response.user_id);
		if(!user) return "Couldn't get that response's user!";

		var post = await bot.stores.responsePosts.getByResponse(msg.guild.id, response.hid);
		var chan = msg.guild.channels.resolve(post?.channel_id);
		var message = await chan?.messages.fetch(post?.message_id);

		var reason;
		await msg.channel.send([
            'Would you like to give a denial reason?\n',
            'Type `skip` to skip adding one, or ',
            '`cancel` to cancel the denial!'
        ].join(''));
		var resp = await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {time: 2 * 60 * 1000, max: 1});
        if(!resp?.first()) return 'Err! Timed out!';
        resp = resp.first().content;
        if(resp.toLowerCase() == 'cancel') return 'Action cancelled!';
        if(resp.toLowerCase() == 'skip') reason = '*(no reason given)*';
        else reason = resp;

		if(message) {
			var embed = message.embeds[0];
			embed.color = parseInt('aa5555', 16);
			embed.footer = {text: 'Response denied!'};
			embed.timestamp = new Date().toISOString();
			try {
				await bot.stores.responsePosts.delete(message.guild.id, message.channel.id, message.id);
				await message.edit({embed});
				await message.reactions.removeAll();
			} catch(e) {
				return 'ERR! '+(e.message || e);
			}
		}

		try {
			response = await bot.stores.responses.update(msg.guild.id, response.hid, {status: 'denied'});
			await user.send({embed: {
				title: 'Response denied!',
				description: [
					`Server: ${msg.guild.name} (${msg.guild.id})`,
					`Form name: ${response.form.name}`,
					`Form ID: ${response.form.hid}`,
					`Response ID: ${response.hid}`
				].join("\n"),
				fields: [{name: 'Reason', value: reason}],
				color: parseInt('aa5555', 16),
				timestamp: new Date().toISOString()
			}})
			bot.emit('DENY', response)
		} catch(e) {
			console.log(e);
			return 'ERR! Response denied, but couldn\'t message the user!';
		}

		return 'Response denied!';
	},
	alias: ['fail'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}