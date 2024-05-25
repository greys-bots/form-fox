const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'take-ent',
			description: "Takes a test entitlement away from a guild",
			options: [
				{
					name: 'guild',
					description: 'The guild to take from',
					type: 6,
					required: true
				},
				{
					name: "sku",
					description: "The ID of the SKU to take the entitlement from",
					type: 3,
					required: true
				}
			],
			usage: [
				'[guild] [sku] - Takes a test entitlement from a guild'
			]
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		if(ctx.user.id !== this.#bot.owner) return "Only the bot owner can use this!";

		var guild = ctx.options.getString('guild').trim();
		var sku = ctx.options.getString('sku')?.trim();

		var ent = await this.#bot.application.entitlements.fetch({
			guild,
			skus: [sku]
		})

		ent = ent?.first()
		if(!ent) return "No entitlement to delete!";

		await this.#bot.application.entitlements.deleteTest(ent.id)

		return "Entitlement taken!";
	}
}

module.exports = (bot, stores) => new Command(bot, stores);