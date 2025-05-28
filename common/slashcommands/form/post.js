const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'post',
			description: 'Posts a form in the given channel',
			options: [
				{
					name: 'form_id',
					description: 'The form\'s ID',
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'channel',
					description: 'The channel to post in',
					type: 7,
					required: true,
					channel_types: [0, 5, 10, 11, 12]
				}
			],
			usage: [
				"[form_id] [channel] - Post a form embed in a channel"
			],
			permissions: ['ManageMessages'],
			guildOnly: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var chan = ctx.options.getChannel('channel');
		var form = await this.#stores.forms.get(ctx.guildId, id);
		if(!form.id) return 'Form not found!';

		let emoji = {}
		if(form.emoji) {
			let match = form.emoji.match(/\d{14,}/g);
			if(match?.length) emoji.id = match[0];
			else emoji.name = form.emoji.replace(/:/g, "");
		} else emoji.name = "📝";

		try {
			var embed = await form.getEmbed();
			var message = await chan.send({
				flags: ['IsComponentsV2'],
				components: [
					embed,
					{
						type: 1,
						components: [{
							type: 2,
							label: form.button_text ?? 'Apply',
							emoji,
							style: form.button_style != undefined ? form.button_style : 1,
							custom_id: `${form.hid}-apply`
						}]
					}
				]
			});
			var p = await this.#stores.formPosts.create({
				server_id: ctx.guildId,
				channel_id: chan.id,
				message_id: message.id,
				form: form.hid
			});
		} catch(e) {
			return 'ERR! '+(e.message || e);
		}
		return 'Posted!';
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