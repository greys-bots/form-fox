const { events: EVENTS } = require(__dirname + '/../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'add',
			description: 'Add a role to a form',
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
					description: "The roles to add (@ping them!)",
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
				},
				{
					name: 'action',
					description: "The action to take on the role (adding/removing)",
					type: 3,
					required: true,
					choices: [
						{
							name: 'add role',
							value: 'add'
						},
						{
							name: 'remove role',
							value: 'remove'
						}
					]
				}
			],
			usage: [
				"[form_id] [roles] [event] [action] - Add roles to a form"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var roles = ctx.options.resolved.roles;
		if(!roles?.size) return "Please provide at least one valid role!";
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';
		var event = ctx.options.getString('event');
		var action = ctx.options.getString('action');

		if(Array.isArray(form.roles)) await form.fixRoles();
		if(!form.roles) form.roles = { };
		if(!form.roles[event]) form.roles[event] = [];
		var toAdd = [];
		for(var [id, r] of roles) {
			if(form.roles[event]?.find(x => x.id == r.id)) {
				// update with new action for now
				var ind = form.roles[event].findIndex(x => x.id == r.id);
				form.roles[event][ind].action = action;
			} else {
				toAdd.push({id: r.id, action});
			}
		}

		form.roles[event] = form.roles[event].concat(toAdd);

		await form.save();
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