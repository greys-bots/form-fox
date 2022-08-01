const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'apply',
			description: 'Apply to a form',
			options: [{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: false,
				autocomplete: true
			}],
			usage: [
				"[form_id] - Start a new form response"
			],
			permissions: [],
			guildOnly: true,
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.getString('form_id')?.toLowerCase().trim();
		var form;
		if(!id) {
			form = await this.#stores.forms.getByApplyChannel(ctx.guild.id, ctx.channel.id);
			if(!form?.id) return "Please supply a form ID, or use this in a form's apply channel!";
		} else {
			form = await this.#stores.forms.get(ctx.guildId, id);;
			if(!form.id) return 'Form not found!';
		}

		if(form.apply_channel && form.apply_channel != ctx.channel.id)
		return `This isn't the right channel for that form! Please apply in <#${form.apply_channel}>`;

		var cfg = await this.#stores.configs.get(ctx.guildId);

		var resp = await this.#bot.handlers.response.startResponse({
			user: ctx.user,
			form,
			cfg
		});
		
		if(resp) return resp;
		else return;
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