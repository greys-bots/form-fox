module.exports = {
	help: ()=> 'Unbind a form reaction from the given message',
	usage: ()=> [' [form id] [channel] [message id] - Unbinds a form react from a message'],
	execute: async (bot, msg, args) => {
		if(!args[2]) return 'I need a form, channel, and message to work with!';

		try {
			var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
			if(!form) return 'Form not found!';
			var channel = msg.channel.guild.channels.cache.find(c => [c.name, c.id].includes(args[1].toLowerCase().replace(/[<@#>]/g, '')));
			if(!channel) return 'Channel not found!';
			var message = await channel.messages.fetch(args[2]);
			if(!message) return 'Message not found!';
			var post = await bot.stores.formPosts.getBound(msg.channel.guild.id, message.id, form.hid);
			if(!post) return 'Form not bound to that message!';
			var react = message.reactions.cache.find(r => [r.emoji.name, r.emoji.identifier].includes(form.emoji || '📝'));

			if(react) react.remove();
			await bot.stores.formPosts.delete(msg.channel.guild.id, channel.id, message.id);
		} catch(e) {
			return 'ERR! '+(e.message || e);
		}

		return 'Unbound!';
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}