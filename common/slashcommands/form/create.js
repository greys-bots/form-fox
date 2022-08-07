const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'create',
			description: "Create a new form",
			// options: [
				// {
					// name: 'name',
					// description: "The form's name",
					// type: 3,
					// required: true
				// },
				// {
					// name: 'description',
					// description: "The form's description",
					// type: 3,
					// required: true
				// }
			// ],
			usage: [
				"[name] [description] - Creates a new form with the given name and description"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		return await this.#bot.handlers.form.handleCreate(ctx);
	}
}

module.exports = (bot, stores) => new Command(bot, stores);