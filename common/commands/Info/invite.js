const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'invite',
			description: "Get the bot's invite",
			usage: [" - Gets an invite for the bot"],
			alias: ['i', 'inv'],
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		return `You can invite me with this:\n${this.#bot.invite}`;
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);