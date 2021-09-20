module.exports = {
	data: {
		name: "about",
		description: "Info about the bot"
	},
	usage: [
		"- Gives info about the bot"
	],
	async execute(ctx) {
		return {embeds: [{
			title: '**About**',
			description: "Eee! I'm Fox! I help people set up forms and responses here on Discord!",
			fields:[
				{name: "Creators", value: "[greysdawn](https://github.com/greysdawn) | (GS)#6969"},
				{name: "Invite", value: `[Clicky!](${process.env.INVITE})`,inline: true},
				{name: "Support Server", value: "[Clicky!](https://discord.gg/EvDmXGt)", inline: true},
				{name: "Other Links", value: "[Repo](https://github.com/greys-bots/form-fox)"},
				{name: "Stats", value: `Guilds: ${ctx.client.guilds.cache.size} | Users: ${ctx.client.users.cache.size}`},
				{name: "Support my creators!", value: "[Ko-Fi](https://ko-fi.com/greysdawn) | [Patreon](https://patreon.com/greysdawn)"}
			]
		}]}
	},
	ephemeral: true
}