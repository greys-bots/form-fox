const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: 'View existing forms',
			options: [
				{
					name: "form_id",
					description: "The form's ID",
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"- View all forms",
				"[form_id] - View a specific form"
			],
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var arg = ctx.options.get('form_id')?.value.toLowerCase().trim();
		if(!arg) {
			var forms = await this.#stores.forms.getAll(ctx.guildId);
			if(!forms?.[0]) return 'No forms available';

			var embeds = [];
			for(var f of forms) {
				var emb = await f.getInfo();
				embeds.push({components: [emb]})
			}

			return embeds;
		}

		var form = await this.#stores.forms.get(ctx.guildId, arg);
		if(!form.id) return 'Form not found!';
		console.log(form.roles)

		
		var emb = await form.getInfo();
		return [{components: [emb]}]
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