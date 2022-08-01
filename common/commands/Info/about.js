const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'about',
			description: "A little about the bot",
			usage: [" - Just what's on the tin"],
			arguments: { },
			alias: ['abt', 'a'],
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({bot, msg, args}) {
		var cfg;
		if(msg.channel.guild) cfg = await this.#stores.configs.get(msg.channel.guild.id);

		var pmsg = "My default prefix is `" + this.#bot.prefix + "`";
		if(cfg?.prefix) pmsg += `, and my prefix for this server is \`${cfg.prefix}\``
		return ({
			title: '**About**',
			description: "Eee! I'm Fox! I help people set up forms and responses here on Discord!\n" + pmsg,
			fields:[
				{name: "Creators", value: "[greysdawn](https://github.com/greysdawn) | (GS)#6969"},
				{name: "Invite", value: `[Clicky!](${this.#bot.invite})`,inline: true},
				{name: "Support Server", value: "[Clicky!](https://discord.gg/EvDmXGt)", inline: true},
				{name: "Other Links", value: "[Repo](https://github.com/greys-bots/form-fox)"},
				{name: "Stats", value: `Guilds: ${this.#bot.guilds.cache.size} | Users: ${this.#bot.users.cache.size}`},
				{name: "Support my creators!", value: "[Ko-Fi](https://ko-fi.com/greysdawn) | [Patreon](https://patreon.com/greysdawn)"}
			]
		})
	}
}
module.exports = (bot, stores, mod) => new Command(bot, stores, mod);
