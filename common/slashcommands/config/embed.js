const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "embed",
			description: "Change if the info embed is sent when applying to a form",
			options: [
				{
					name: 'value',
					description: 'The value for whether the embed is sent',
					type: 5,
					required: true
				},
				{
					name: 'form_id',
					description: "ID of a form to change",
					type: 3,
					required: false
				}
			],
			usage: [
				"[value] - Set the default value for all forms",
				"[value] [form_id] - Set the value for a form"
			],
			extra: "The info embed is a list of questions sent when a user applies to a form. "+
				   "By default this setting is TRUE, so it sends the embed. " +
				   "Set it to false to turn it off",
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var val = ctx.options.getBoolean('value');
		var farg = ctx.options.get('form_id')?.value.toLowerCase().trim();

		if(farg) {
			var form = await this.#stores.forms.get(ctx.guildId, farg);
			if(!form.id) return 'Form not found!';

			form.embed = val;
			await form.save();
			return "Form updated!";
		}

		var cfg = await this.#stores.configs.get(ctx.guildId);
		cfg.embed = val;
		await cfg.save();
		
		return "Config updated!";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);