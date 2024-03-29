const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'roles',
			description: "Manage roles associated with specific questions",
			type: 2,
			guildOnly: true,
			permissions: ['ManageMessages'],
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);