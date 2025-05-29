const { numbers: NUMS } = require('../../extras');
const TYPES = require('../../questions');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'roles',
			description: "Add roles to a question",
			ephemeral: true,
			guildOnly: true,
			permissions: ['ManageMessages'],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		return "This command has moved to `/actions add`! Please use that command and select the `role:add` or `role:remove` action type"
	}
}

module.exports = (bot, stores) => new Command(bot, stores);