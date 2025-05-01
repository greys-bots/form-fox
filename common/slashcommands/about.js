const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "about",
			description: "Info about the bot",
			usage: [
				"- Gives info about the bot"
			],
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		return [{
			components: [{
				type: 17,
				accent_color: 0xee8833,
				components: [
					{
						type: 10,
						content: "-# About"
					},
					{
						type: 14
					},
					{
						type: 10,
						content:
							"# Eee! I'm Fox!\n" +
							"I help people set up forms and responses here on Discord!\n" +
							"## Creators\n" +
							"[greysdawn](https://github.com/greysdawn) | @greysdawn\n" +
							"## Stats\n" +
							`**Guilds:** ${this.#bot.guilds.cache.size} | **Users:** ${this.#bot.users.cache.size}`
					},
					{
						type: 14
					},
					{
						type: 9,
						components: [{
							type: 10,
							content: "Invite me!"
						}],
						accessory: {
							type: 2,
							style: '5',
							label: 'Invite',
							url: "https://discordapp.com/api/oauth2/authorize?client_id=737192331241062462"
						}
					},
					{
						type: 1,
						components: [
							{
								type: 2,
								style: 5,
								label: "Support server",
								url: "https://discord.gg/EvDmXGt"
							},
							{
								type: 2,
								style: 5,
								label: "Github",
								url: "https://github.com/greys-bots/form-fox"
							},
							{
								type: 2,
								style: 5,
								label: "Patreon",
								url: "https://patreon.com/greysdawn"
							},
							{
								type: 2,
								style: 5,
								label: "Ko-Fi",
								url: "https://ko-fi.com/greysdawn"
							}
						]
					}
				]
			}]
		}]
	}
}

module.exports = (bot, stores) => new Command(bot, stores);