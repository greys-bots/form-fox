const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'hooks',
			description: "Commands for handling form hooks",
			type: 2,
			guildOnly: true,
			permissions: ['ManageMessages'],
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);