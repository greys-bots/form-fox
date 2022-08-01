const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;
			
	constructor(bot, stores, module) {
		super({
			name: 'help',
			description: "Displays command help info",
			arguments: {
				command: {
					type: 'string',
					description: "The command to view help for",
					optional: true
				},
				subcommand: {
					type: 'string',
					description: 'A subcommand to view help for',
					optional: true
				}
			},
			usage: [
				" - Displays help for all commands",
				" [command] - Displays help for specfic command",
				" [command] [subcommand] - Displays help for a command's subcommands"
			],

			alias: [ "h", "?"],
			permissions: [ ],
			guildOnly: false,
			module
		});

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		var cfg;
		if(msg.channel.guild) cfg = await this.#stores.configs.get(msg.channel.guild.id);

		var prefix = cfg?.prefix ?? this.#bot.prefix;
		if(!args[0]) {
			//setup
			var modules = this.#bot.modules.map(m => m);
			modules.forEach(m => m.commands = m.commands.map(c => c));

			var embeds = [{embed: {
				title: "Eee! I'm Fox!",
				description: "I help you make and manage forms here on discord! Here are some of my features:",
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
							'\n- Attachment' +
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
						name: 'Answer-based roles',
						value:
							"In addition to form customization, you can also " +
							"set up roles to be added based on a user's answers!\n" +
							"For example, you can automatically give users an `Adult` " +
							"role if they answer your form's age question with a " +
							"number over 18"
					},
					{
						name: "Need help? Join the support server!",
						value: "[https://discord.gg/EvDmXGt](https://discord.gg/EvDmXGt)",
						inline: true
					},
					{
						name: "Support my creators!",
						value: 
							"[patreon](https://patreon.com/greysdawn) | " +
							"[ko-fi](https://ko-fi.com/greysdawn)",
						inline: true
					}
				],
				color: parseInt('ee8833', 16),
				footer: {
					icon_url: this.#bot.user.avatarURL(),
					text: "Use the reactions below to flip pages!"
				}
			}}];
			for(var i = 0; i < modules.length; i++) {
				var tmp_embeds = await this.#bot.utils.genEmbeds(this.#bot, modules[i].commands, c => {
					return {name:  `**${prefix + c.name}**`, value: c.help ? c.help() : c.description}
				}, {
					title: `**${modules[i].name}**`,
					description: modules[i].description,
					color: parseInt(modules[i].color, 16) || parseInt("555555", 16),
					footer: {
						icon_url: this.#bot.user.avatarURL(),
						text: "I'm Fox! I help you handle forms!"
					}
				}, 10, {addition: ""})
				
				embeds = embeds.concat(tmp_embeds);
			}

			for(let i=0; i<embeds.length; i++) {
				if(embeds.length > 1) embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${this.#bot.commands.size} commands total)`;
			}

			return embeds;
		}

		let {command} = await this.#bot.handlers.command.parse(args.join(" "));
		if(command) {
			var embed = {embed: {
				title: `Help | ${command.name.toLowerCase()}`,
				description: command.help ? command.help() : command.description,
				fields: [
					{name: "**Usage**", value: `${command.usage.map(c => `**${prefix + command.name}**${c}`).join("\n")}`},
					{name: "**Aliases**", value: `${command.alias?.length ? command.alias.join(", ") : "(none)"}`},
					{name: "**Subcommands**", value: `${command.subcommands?.first() ?
							command.subcommands.map(sc => `**${prefix}${sc.name}** - ${sc.description}`).join("\n") : 
							"(none)"}`}
				],
				color: parseInt(command.module.color, 16) || parseInt("555555", 16),
				footer: {
					icon_url: this.#bot.user.avatarURL(),
					text: "Arguments like [this] are required, arguments like <this> are optional!"
				}
			}};
			if(command.extra) embed.embed.fields.push({name: "**Extra Info**", value: command.extra});
			if(command.permissions?.length) embed.embed.fields.push({name: "**Permissions**", value: command.permissions.join(", ")});

			return embed;
		} else return "Command not found!";
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);