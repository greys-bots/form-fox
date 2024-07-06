const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: 'View actions attached to a form',
			options: [{
				name: 'form',
				description: "The form's ID",
				type: 3,
				required: false,
				autocomplete: true
			}],
			usage: [
				"[form] - View actions attached to a form"
			],
			permissions: [],
			guildOnly: true,
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		const ACTIONS = this.#bot.handlers.action.Types;
		
		var fid = ctx.options.getString('form')?.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, fid);
		if(!form) return 'Form not found!';

		var config = await this.#stores.configs.get(ctx.guild.id);
		var channel;
		if(form.channel_id) channel = await ctx.guild.channels.fetch(form.channel_id);
		else if(config.response_channel) channel = await ctx.guild.channels.fetch(config.response_channel);

		var actions = await this.#stores.actions.getByForm(ctx.guild.id, form.hid);
		if(!actions?.length) return "No actions registered for that form!";

		var embeds = [];
		for(var action of actions) {
			var act = ACTIONS.find(x => x.type == action.data.type);
			if(!act) continue;

			var fields = act.transform(action, { guild: ctx.guild, channel, form, inter: ctx });
			embeds.push({
				title: 'Action ' + action.hid,
				fields
			})
		}

		return embeds;
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