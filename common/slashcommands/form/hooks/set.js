const { events: EVENTS } = require(__dirname + '/../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'set',
			description: 'Set a hook for a form',
			type: 1,
			options: [
				{
					name: 'form_id',
					description: "The form's ID",
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'url',
					description: "The hook's URL",
					type: 3,
					required: true
				}
			],
			usage: [
				"[form_id] [url] - Delete all other hooks and set a new one on a form"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		var url = ctx.options.get('url').value;
		if(!this.#bot.utils.checkUrl(url)) return "I need a valid URL!";

		var events = await this.#bot.utils.awaitSelection(ctx, EVENTS.map(e => {
			return {label: e, value: e}
		}), "What events do you want this hook to fire on?", {
			min_values: 1, max_values: EVENTS.length,
			placeholder: 'Select events'
		})
		if(typeof events == 'string') return events;
		
		await this.#stores.hooks.deleteByForm(ctx.guildId, form.hid);
		var hook = await this.#stores.hooks.create({
			server_id: ctx.guildId,
			form: form.hid,
			url,
			events
		});

		return `Hook created! ID: ${hook.hid}`;
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