const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'add',
			description: 'Add actions to forms',
			options: [
				{
					name: 'form',
					description: "ID of the form to add an action to",
					type: 3,
					required: true,
					autocomplete: true
				}
			],
			usage: [
				'[form] [name] - Add a new action to a form'
			]
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		const ACTIONS = this.#bot.handlers.action.Types;

		var fid = ctx.options.getString('form')?.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guild.id, fid);
		if(!form) return 'Form not found!';

		var config = await this.#stores.configs.get(ctx.guild.id);
		var channel;
		if(form.channel_id) channel = await ctx.guild.channels.fetch(form.channel_id);
		else if(config.response_channel) channel = await ctx.guild.channels.fetch(config.response_channel);

		var actionChoices = ACTIONS.map(x => ({
			label: x.type,
			description: x.description,
			value: x.type
		}))

		var resp;

		resp = await this.#bot.utils.awaitSelection(ctx, actionChoices, "Select an action type", {
			min_values: 1,
			max_values: 1,
			placeholder: 'Select a type...'
		});
		if(!Array.isArray(resp)) return resp;

		var actionInfo = ACTIONS.find(x => x.type == resp[0]);
		var type = actionInfo.type
		var actionData = {
			type
		}

		resp = await this.#bot.utils.awaitSelection(
			ctx,
			actionInfo.events.map(x => ({
				label: x.toLowerCase(),
				value: x
			})),
			"Select a form event for this action to take place on",
			{ min_values: 1, max_values: 1, placeholder: 'Select an event...' }
		)
		if(!Array.isArray(resp)) return resp;

		var event = resp[0]
		actionData = { ...actionData, event };

		await form.getQuestions();
		var result = await actionInfo.setup({
			form,
			config,
			channel,
			inter: ctx,
			client: ctx.client
		})

		if(!result.success) return result.message;

		actionData = { ...actionData, ...result.data };
		
		await this.#stores.actions.create({
			server_id: ctx.guild.id,
			form: form.hid,
			type,
			event,
			priority: actionInfo.priority ?? 1,
			data: actionData
		});
		return "Action added!";
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