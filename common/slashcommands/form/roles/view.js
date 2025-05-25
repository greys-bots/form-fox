const { Models: { SlashCommand } } = require('frame');
const {
	events: EVENTS
} = require(__dirname + '/../../../extras.js');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: "View a form's set roles",
			type: 1,
			options: [{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			}],
			usage: [
				"[form_id] - View roles on a form"
			],
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		console.log(form.roles)
		if(Array.isArray(form.roles)) await form.fixRoles();
		if(!Object.keys(form.roles)?.length) return "No roles for that form!";
		console.log(form.roles)
		
		return [{components: [{
			type: 17,
			components: [
				{
					type: 10,
					content: `## ${form.name} - Roles`
				},
				...EVENTS.map(e => {
					var val = form.roles[e.toUpperCase()]
								.map(x => `<@&${x.id}> - ${x.action}`)
								.join("\n");
					return {
						type: 10,
						content:
							`### ${e.toUpperCase()}\n` +
							val?.length ? val : "*None set*"
					}
				})
			] 
		}]}]
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