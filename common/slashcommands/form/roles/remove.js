const { Models: { SlashCommand } } = require('frame');
const { events: EVENTS } = require(__dirname + '/../../../extras');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'remove',
			description: 'Remove roles from a form',
			type: 1,
			options: [
				{
					name: 'form_id',
					description: "The form's ID",
					type: 3,
					required: true,
					autocomplete: true
				}, {
					name: 'roles',
					description: "The roles to remove",
					type: 3,
					required: true
				},
				{
					name: 'event',
					description: "The event to remove roles from",
					type: 3,
					required: false,
					choices: EVENTS.map(e => ({
						name: e,
						value: e.toUpperCase()
					}))
				}
			],
			usage: [
				"[form_id] [roles] - Remove roles from a form",
				"[form_id] [roles] [event] - Remove roles from a specific form event"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var roles = ctx.options.resolved.roles;
		if(!roles?.size) return "Please provide at least one valid role!";
		roles = roles.map(r => r.id);
		
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		var event = ctx.options.getString('event');

		if(Array.isArray(form.roles)) await form.fixRoles();
		if(!Object.keys(form.roles)?.length) return "No roles to remove!";
		var events;
		if(event) events = [event];
		else events = EVENTS;
		for(var e of events) {
			if(!form.roles[e]) continue;
			form.roles[e] = form.roles[e].filter(x => !roles.includes(x.id));
		}

		await form.save()
		return "Form updated!";
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