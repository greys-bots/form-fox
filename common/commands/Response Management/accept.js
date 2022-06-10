const VARIABLES = {
    '$USER': (user, guild) => user,
    '$GUILD': (user, guild) => guild.name,
    '$FORM': (user, guild, form) => form.name,
    '$FORMID': (user, guild, form) => form.id,
}

module.exports = {
	help: ()=> "Manually accept a response, in case reactions aren't working",
	usage: ()=> [' [response ID] - Manually accepts the response with the given ID'],
	execute: async ({bot, msg, args}) => {
		if(!args[0]) return 'I need a response to accept!';

		var response = await bot.stores.responses.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!response.id) return 'Response not found!';

		var user = await bot.users.fetch(response.user_id);
		if(!user) return "Couldn't get that response's user!";

		var post = await bot.stores.responsePosts.getByResponse(msg.channel.guild.id, response.hid);
		var chan = msg.channel.guild.channels.resolve(post?.channel_id);
		var message = await chan?.messages.fetch(post?.message_id);

		if(message) {
			var embed = message.embeds[0];
			embed.color = parseInt('aa5555', 16);
			embed.footer = {text: 'Response accepted!'};
			embed.timestamp = new Date().toISOString();
			try {
				await message.edit({embeds: [embed]});
				await message.reactions.removeAll();
			} catch(e) {
				return 'ERR! '+(e.message || e);
			}
		}

		try {
			var welc = response.form.message;
            if(welc) {
                for(var key of Object.keys(VARIABLES)) {
                    welc = welc.replace(key, eval(VARIABLES[key]));
                }
            }

			response.status = 'accepted';
            response = await response.save()
            await user.send({embeds: [{
                title: 'Response accepted!',
                description: welc,
                fields: [
                	{name: 'Server', value: `${msg.channel.guild.name} (${msg.channel.guild.id})`},
                	{name: 'Form name', value: `${response.form.name}`},
                	{name: 'Form ID', value: `${response.form.hid}`},
                	{name: 'Response ID', value: `${response.hid}`}
                ],
                color: parseInt('55aa55', 16),
                timestamp: new Date().toISOString()
            }]});
            bot.emit('ACCEPT', response)

			if(response.form.roles) {
				var member = msg.channel.guild.members.resolve(user.id);
				try {
					await member.roles.add(response.form.roles);
				} catch(e) {
					msg.channel.send('Err while adding roles: '+e.message);
				}
			}
			await post.delete()
		} catch(e) {
			console.log(e);
			return 'ERR! Response accepted, but couldn\'t message the user!';
		}

		return 'Response accepted!';
	},
	alias: ['acc', 'pass'],
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_RESPONSES'],
	guildOnly: true
}