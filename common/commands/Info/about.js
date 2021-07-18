module.exports = {
	help: ()=> "A little about the bot",
	usage: ()=> [" - Just what's on the tin"],
	execute: async (bot, msg, args) => {
		var cfg;
		if(msg.guild) cfg = await bot.stores.configs.get(msg.guild.id);

		var pmsg = "My default prefix is `" + bot.prefix + "`";
		if(cfg?.prefix) pmsg += `, and my prefix for this server is \`${cfg.prefix}\``
		return ({embed: {
			title: '**About**',
			description: "Eee! I'm Fox! I help people set up forms and responses here on Discord!\nMy prefix is `ff!`",
			fields:[
				{name: "Creators", value: "[greysdawn](https://github.com/greysdawn) | (GS)#6969"},
				{name: "Invite", value: `[Clicky!](${bot.invite})`,inline: true},
				{name: "Support Server", value: "[Clicky!](https://discord.gg/EvDmXGt)", inline: true},
				{name: "Other Links", value: "[Repo](https://github.com/greys-bots/form-fox)"},
				{name: "Stats", value: `Guilds: ${bot.guilds.cache.size} | Users: ${bot.users.cache.size}`},
				{name: "Support my creators!", value: "[Ko-Fi](https://ko-fi.com/greysdawn) | [Patreon](https://patreon.com/greysdawn)"}
			]
		}})
	},
	alias: ['abt', 'a']
}
