const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'unbind',
			description: "Unbind a form's apply react from a message",
			options: [
				{
					name: 'form_id',
					description: "The form's ID",
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'msg_id',
					description: "The message to unbind from",
					type: 3,
					required: true
				},
				{
					name: 'channel',
					description: "The channel the message belongs to. Defaults to the command channel",
					type: 7,
					required: false,
					channel_types: [0, 5, 10, 11, 12]
				}
			],
			usage: [
				"[form_id] [msg_id] - Unbind a form react from a message in the same channel",
				"[form_id] [msg_id] [channel] - Unbind a form react from a message in another channel"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		var channel;
		var ch = ctx.options.getChannel('channel');
		if(ch && ['GUILD_TEXT', 'GUILD_NEWS'].includes(ch.type)) channel = ch;
		else channel = ctx.channel;

		var mid = ctx.options.get('msg_id').value.trim();
		var msg;
		try {
			msg = await channel.messages.fetch(mid);
		} catch(e) {
			return 'Message not found!';
		}

		var post = await this.#stores.formPosts.getBound(ctx.guildId, msg.id, form.hid);
		if(!post) return "That form isn't bound to that post!";

		var react = msg.reactions.cache.find(r => [r.emoji.name, r.emoji.identifier].includes(form.emoji || '📝'));
		if(react) react.remove();

		await post.delete()
		return 'Unbound!'
	}

	async auto(ctx) {
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	}
}

module.exports = (bot, stores) => new Command(bot, stores);