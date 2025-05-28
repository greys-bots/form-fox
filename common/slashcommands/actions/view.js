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
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		const ACTIONS = this.#bot.handlers.action.Types;

		var actions = await this.#stores.actions.getAll(ctx.guild.id);
		if(!actions?.length) return "No actions registered!";
		
		var fid = ctx.options.getString('form')?.toLowerCase().trim();
		if(fid) {
			actions = actions.filter(x => x.form == fid);
			if(!actions?.length) return "No actions registered for that form!";
		}

		var forms = { };
		var configs = { };
		var channels = { };

		var embeds = [];
		for(var action of actions) {
			var form;
			if(forms[action.form]) form = forms[action.form];
			else {
				form = await this.#stores.forms.get(ctx.guild.id, action.form);
				await form.getQuestions();
				forms[action.form] = form;
			}

			var config;
			if(configs[ctx.guild.id]) config = configs[ctx.guild.id]
			else {
				config = await this.#stores.configs.get(ctx.guild.id);
				configs[ctx.guild.id] = config;
			}

			var channel;
			var chid = form.channel_id ?? config.response_channel;
			if(chid) {
				channel = channels[chid];
				if(!channel) {
					channel = await ctx.guild.channels.fetch(chid);
					channel[chid] = channel;
				}
			}

			var act = ACTIONS.find(x => x.type == action.type);
			if(!act) continue;

			var fields = act.transform(action, { guild: ctx.guild, channel, form, inter: ctx });
			embeds.push({
				components: [{
					type: 17,
					components: [
						{
							type: 10,
							content: `## Action ${action.hid}`	
						},
						...fields
					]
				}]
			})
		}

		console.log(embeds);
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