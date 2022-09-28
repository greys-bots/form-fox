const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'question',
			description: 'Commands for handling form questions',
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);