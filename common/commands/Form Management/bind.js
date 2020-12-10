module.exports = {
	help: ()=> 'Bind a form reaction to the given message',
	usage: ()=> [' [form id] [channel] [message id] - Binds a form react to a message'],
	execute: async (bot, msg, args) => {
		if(!args[2]) return 'I need a form, channel, and message to work with!';

		try {
			var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
			if(!form) return 'Form not found!';
			var channel = msg.guild.channels.cache.find(c => [c.name, c.id].includes(args[1].toLowerCase().replace(/[<@#>]/g, '')));
			if(!channel) return 'Channel not found!';
			var message = await channel.messages.fetch(args[2]);
			if(!message) return 'Message not found!';
			
			var post = await bot.stores.formPosts.get(msg.guild.id, channel.id, message.id);
			if(post && !post.bound) return 'That is a dedicated post and cannot be bound to!';
			post = (await bot.stores.formPosts.getByMessage(msg.guild.id, message.id))
				   ?.find(p => p.form.emoji == form.emoji);
			if(post) return 'Form with that emoji already bound to that message!';

			message.react(form.emoji || '📝');
			await bot.stores.formPosts.create(msg.guild.id, channel.id, message.id, {
				form: form.hid,
				bound: true
			});
		} catch(e) {
			return 'ERR! '+(e.message || e);
		}

		return 'Bound!';
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}