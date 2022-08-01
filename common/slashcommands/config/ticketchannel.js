const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'ticketcategory',
			description: 'Set a ticket category',
			options: [
				{
					name: 'category',
					description: 'The category to set',
					type: 7,
					required: true,
					channel_types: [4]
				},
				{
					name: 'form_id',
					description: "ID of a form to change",
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"[category] - Set the default ticket category for all forms",
				"[category] [form_id] - Set the ticket category for a form"
			],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var farg = ctx.options.getString('form_id')?.toLowerCase().trim();
		var chan = ctx.options.getChannel('category');

		if(farg) {
			var form = await this.#stores.forms.get(ctx.guildId, farg);
			if(!form.id) return 'Form not found!';

			form.tickets_id = chan.id;
			await form.save()
			return "Form updated!";
		}

		var cfg = await this.#stores.configs.get(ctx.guildId);
		cfg.ticket_category = chan.id;
		await cfg.save()
		
		return "Config updated!";
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