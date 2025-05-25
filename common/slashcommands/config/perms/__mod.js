const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'perms',
			description: "Manage bot admin permissions for users and roles",
			type: 2,
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_OPS']
		})
		this.#bot = bot;
		this.#stores = stores;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);