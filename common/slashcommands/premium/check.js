const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "check",
			description: "Check current premium status",
			usage: [
				"- Checks current status"
			],
			ephemeral: true,
			guildOnly: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var info = await this.#bot.handlers.premium.checkAccess(ctx.guild.id);

		if(!info.access) {
			switch(info.error) {
				case 'none':
					return (
						"Your guild doesn't have any entitlements :(\n" +
						"Check out the store on my profile to fix that!"
					)
				case 'expired':
					return (
						"Your guild doesn't have any active entitlements :(\n" +
						"Check out the store on my profile to resubscribe!"
					)
			}
		}

		return `Current entitlements:\n` + info.text;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);