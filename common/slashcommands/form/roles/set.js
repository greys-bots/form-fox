const { events: EVENTS } = require(__dirname + '/../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'set',
			description: "Set the roles for a form",
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
					name: 'roles',
					description: 'The roles you want. Use mentions here',
					type: 3,
					required: true
				},
				{
					name: 'event',
					description: "The event the roles should be added on",
					type: 3,
					required: true,
					choices: EVENTS.map(e => ({
						name: e,
						value: e.toUpperCase()
					}))
				}
			],
			usage: [
				"[form_id] [roles] - Set the roles on a form"
			],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var roles = ctx.options.resolved.roles;
		if(!roles?.size) return "Please provide valid roles!";
		var event = ctx.options.getString('event');
		
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		roles = roles.map(r => ({id: r.id, events: [event]}));

		form.roles = JSON.stringify(roles);
		await form.save();
		
		return 'Form updated!';
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