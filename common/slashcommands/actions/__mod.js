const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'actions',
			description: 'Commands for managing form actions',
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);