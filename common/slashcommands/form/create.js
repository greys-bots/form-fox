const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'create',
			description: "Create a new form",
			options: [
				{
					name: 'name',
					description: "The form's name",
					type: 3,
					required: true
				},
				{
					name: 'description',
					description: "The form's description",
					type: 3,
					required: true
				}
			],
			usage: [
				"[name] [description] - Creates a new form with the given name and description"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var name = ctx.options.getString('name').trim();
		var description = ctx.options.getString('description').trim();

		var form = await this.#stores.forms.create({
			server_id: ctx.guildId,
			name,
			description,
			questions: []
		});

		return (
			`Form created! ID: ${form.hid}` +
			"\nUse `/question add` to start adding questions to this form" +
			"\nUse `/config channel` to set the response channel for this form" +
			"\nUse `/form post` to post your form" +
			"\nUse `/help form` for some customization options!"
		)
	}
}

module.exports = (bot, stores) => new Command(bot, stores);