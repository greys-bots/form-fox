const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'unbind',
			description: 'Unbind a form reaction from the given message',
			usage: [' [form id] [channel] [message id] - Unbinds a form react from a message'],
			permissions: ['MANAGE_MESSAGES'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[2]) return 'I need a form, channel, and message to work with!';

		try {
			var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
			if(!form.id) return 'Form not found!';
			var channel = msg.channel.guild.channels.cache.find(c => [c.name, c.id].includes(args[1].toLowerCase().replace(/[<@#>]/g, '')));
			if(!channel) return 'Channel not found!';
			var message = await channel.messages.fetch(args[2]);
			if(!message) return 'Message not found!';
			var post = await this.#stores.formPosts.getBound(msg.channel.guild.id, message.id, form.hid);
			if(!post.id) return 'Form not bound to that message!';
			var react = message.reactions.cache.find(r => [r.emoji.name, r.emoji.identifier].includes(form.emoji || '📝'));

			if(react) react.remove();
			await post.delete()
		} catch(e) {
			return 'ERR! '+(e.message || e);
		}

		return 'Unbound!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);