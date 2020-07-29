module.exports = {
	help: ()=> "Manually accept a response, in case reactions aren't working",
	usage: ()=> [' [response ID] - Manually accepts the response with the given ID'],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a response to accept!';

		var response = await bot.stores.responses.get(msg.guild.id, args[0].toLowerCase());
		if(!response) return 'Response not found!';

		var user = await bot.users.fetch(response.user_id);
		if(!user) return "Couldn't get that response's user!";

		var post = await bot.stores.responsePosts.getByResponse(msg.guild.id, response.hid);
		var chan = msg.guild.channels.resolve(post?.channel_id);
		var message = await chan?.messages.fetch(post?.message_id);

		if(message) {
			var embed = message.embeds[0];
			embed.color = parseInt('aa5555', 16);
			embed.footer = {text: 'Response accepted!'};
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
			await bot.stores.responses.update(msg.guild.id, response.hid, {status: 'accepted'});
			await user.send({embed: {
				title: 'Response accepted!',
				description: [
					`Server: ${msg.guild.name} (${msg.guild.id})`,
					`Form name: ${response.form.name}`,
					`Form ID: ${response.form.hid}`,
					`Response ID: ${response.hid}`
				].join("\n"),
				color: parseInt('55aa55', 16),
				timestamp: new Date().toISOString()
			}})

			if(response.form.roles) {
				var member = msg.guild.members.resolve(user.id);
				try {
					await member.roles.add(response.form.roles);
				} catch(e) {
					msg.channel.send('Err while adding roles: '+e.message);
				}
			}
		} catch(e) {
			console.log(e);
			return 'ERR! Response accepted, but couldn\'t message the user!';
		}

		return 'Response accepted!';
	},
	alias: ['acc', 'pass'],
	permissions: ['MANAGE_MESSAGES']
}