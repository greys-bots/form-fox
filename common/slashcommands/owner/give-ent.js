const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'give-ent',
			description: "Gives a guild a test entitlement",
			options: [
				{
					name: 'guild',
					description: 'The ID of the guild to give to',
					type: 3,
					required: true
				},
				{
					name: "sku",
					description: "The ID of the SKU to give the entitlement for",
					type: 3,
					required: true
				}
			],
			usage: [
				'[guild] [sku] - Gives the guild a test entitlement'
			]
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		if(ctx.user.id !== this.#bot.owner) return "Only the bot owner can use this!";

		var guild = ctx.options.getString('guild').trim();
		var sku = ctx.options.getString('sku')?.trim();

		await this.#bot.application.entitlements.createTest({
			guild,
			sku
		})

		return "Entitlement given!";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);