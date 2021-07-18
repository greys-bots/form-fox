module.exports = {
	help: ()=> "Displays help embed",
	usage: ()=> [
		" - Displays help for all commands",
		" [command] - Displays help for specfic command",
		" [command] [subcommand] - Displays help for a command's subcommands"
	],
	execute: async (bot, msg, args) => {
		var cfg;
		if(msg.guild) cfg = await bot.stores.configs.get(msg.guild.id);

		var prefix = cfg?.prefix || bot.prefix;
		if(!args[0]) {
			//setup
			var modules = bot.modules.map(m => m);
			modules.forEach(m => m.commands = m.commands.map(c => c));

			var embeds = [{embed: {
				title: 'About',
				description: "Hi! I'm Fox! I help you make and manage forms here on discord! Here are some of my features:",
				fields: [
					{
						name: 'Reaction-based interaction',
						value: 'Many of my functions are based on reacts! This keeps typing to a minimum'
					},
					{
						name: 'Several question types',
						value:
							'Fox currently supports several question types, including:' +
							'\n- Multiple choice' +
							'\n- Checkbox' +
							'\n- Freeform' +
							'\n- Specific formats' +
							'\n\nAll of these are also created to be accessible and can be handled using reactions and typing!'
					},
					{
						name: 'Multiple forms per server',
						value: 'Every server can make as many forms as they want!'
					},
					{
						name: 'Individual form customization',
						value: [
							'Every form can have the following customized:',
							'- A name and description',
							'- An acceptance message',
							'- Roles added to users once accepted',
							'- What channel responses go to',
							'- A custom color!'
						].join('\n')
					},
					{
						name: 'An upbeat attitude!',
						value: [
							"This isn't really a feature, but it's worth mentioning :D",
							"I hope you like what I do!"
						].join('\n')
					}
				],
				color: parseInt('ee8833', 16),
				footer: {
					icon_url: bot.user.avatarURL(),
					text: "Use the reactions below to flip pages!"
				}
			}}];
			for(var i = 0; i < modules.length; i++) {
				var tmp_embeds = await bot.utils.genEmbeds(bot, modules[i].commands, c => {
					return {name:  `**${prefix + c.name}**`, value: c.help()}
				}, {
					title: `**${modules[i].name}**`,
					description: modules[i].description,
					color: parseInt(modules[i].color, 16) || parseInt("555555", 16),
					footer: {
						icon_url: bot.user.avatarURL(),
						text: "I'm Fox! I help you handle forms!"
					}
				}, 10, {addition: ""})
				
				embeds = embeds.concat(tmp_embeds);
			}

			for(let i=0; i<embeds.length; i++) {
				if(embeds.length > 1) embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${bot.commands.size} commands total)`;
			}

			return embeds;
		}

		let {command} = await bot.parseCommand(bot, msg, args);
		if(command) {
			var embed = {embed: {
				title: `Help | ${command.name.toLowerCase()}`,
				description: command.help(),
				fields: [
					{name: "**Usage**", value: `${command.usage().map(c => `**${prefix + command.name}**${c}`).join("\n")}`},
					{name: "**Aliases**", value: `${command.alias ? command.alias.join(", ") : "(none)"}`},
					{name: "**Subcommands**", value: `${command.subcommands ?
							command.subcommands.map(sc => `**${prefix}${sc.name}** - ${sc.help()}`).join("\n") : 
							"(none)"}`}
				],
				color: parseInt(command.module.color, 16) || parseInt("555555", 16),
				footer: {
					icon_url: bot.user.avatarURL(),
					text: "Arguments like [this] are required, arguments like <this> are optional!"
				}
			}};
			if(command.desc) embed.embed.fields.push({name: "**Extra Info**", value: command.desc()});
			if(command.permissions) embed.embed.fields.push({name: "**Permissions**", value: command.permissions.join(", ")});

			return embed;
		} else {
			let module = bot.modules.get(args[0].toLowerCase());
			if(!module) return "Command/module not found";
			module.commands = module.commands.map(c => c);

			var embeds = await bot.utils.genEmbeds(bot, module.commands, c => {
				return {name: `**${prefix + c.name}**`, value: c.help()}
			}, {
				title: `**${module.name}**`,
				description: module.description,
				color: parseInt(module.color, 16) || parseInt("555555", 16),
				footer: {
						icon_url: bot.user.avatarURL(),
						text: "I'm Fox! I help you handle forms!"
					}
			}, 10, {addition: ""});

			for(let i=0; i<embeds.length; i++) {
				if(embeds.length > 1) embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${Object.keys(bot.commands).length} commands total)`;
			}

			return embeds;
		}
	},
	alias: ["h", "halp", "?"]
}