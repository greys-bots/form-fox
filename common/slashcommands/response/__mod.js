const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'response',
			description: "Commands for handling responses",
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_RESPONSES']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);