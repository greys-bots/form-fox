const { clearBtns } = require('../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'autothread',
			description: "Sets whether to create a thread on each received response",
			options: [
				{
					name: 'value',
					description: 'The value to set',
					type: 5
				}
			],
			usage: [
				"- View the current auto-threading status",
				"[value] - Set whether to automatically add threads to responses"
			],
			permissions: ['ManageMessages'],
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		var val = ctx.options.getBoolean('value');

		if(val == null || val == undefined) {
			return `Auto-threads are currently **${cfg?.autothread ? "enabled" : "disabled"}**.`
		}

		cfg.autothread = val;
		await cfg.save();
		return 'Config updated!';
	}
}

module.exports = (bot, stores) => new Command(bot, stores);