const { Models: { TextCommand } } = require('frame');
const {confirmReacts: REACTS } = require('../../extras');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'prefix',
			description: "Change the bot's prefix in your server",
			arguments: {
				prefix: {
					type: 'string',
					description: "The prefix to set",
					optional: true
				}
			},
			usage: [
				" - Views and optionally clears the current prefix",
				" [prefix] - Sets a new prefix"
			],
			guildOnly: true,
			permissions: ['MANAGE_MESSAGES'],
			opPerms: ['MANAGE_CONFIG'],
			module
		});

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({bot, msg, args}) {
		return 'This command has been deprecated!';
		/*
		var cfg = await this.#stores.configs.get(msg.channel.guild.id);
		if(!cfg) cfg = {prefix: "", new: true};

		if(!args[0]) {
			if(!cfg.prefix) return 'No prefix set!';

			var message = await msg.channel.send(`Current prefix: ${cfg.prefix}\nWould you like to clear it?`);
			REACTS.forEach(r => message.react(r));

			var conf = await this.#bot.utils.getConfirmation(this.#bot, message, msg.author);
			if(conf.msg) return conf.msg;

			cfg.prefix = undefined;
			await cfg.save();
			return 'Prefix reset!';
		}

		cfg.prefix = args[0].toLowerCase();
		await cfg.save()

		return 'Prefix changed!';
		*/
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);