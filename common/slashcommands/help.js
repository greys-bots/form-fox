const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'help',
			description: "View command help",
			options: [
				{
					name: 'module',
					description: "View help for a specific group of commands",
					type: 3,
					required: false
				},
				{
					name: 'command',
					description: "View help for a specific command in a module",
					type: 3,
					required: false
				},
				{
					name: 'subcommand',
					description: "View help for a command's subcommand",
					type: 3,
					required: false
				}
			],
			usage: [
				"[module] - Get help for a module",
				"[module] [command] - Get help for a command in a module",
				"[module] [command] [subcommand] - Get help for a command's subcommand"	
			],
			extra: "Examples:\n"+
				   "`/help module:form` - Shows form module help",
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var mod = ctx.options.getString('module')?.toLowerCase().trim();
		var cmd = ctx.options.getString('command')?.toLowerCase().trim();
		var scmd = ctx.options.getString('subcommand')?.toLowerCase().trim();

		var embeds = [];
		var cmds;
		if(!mod && !cmd && !scmd) {
			embeds = [{
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
				color: 0xee8833,
				footer: {
					icon_url: this.#bot.user.avatarURL(),
					text: "Use the buttons below to flip pages!"
				}
			}]
			var mods = this.#bot.slashCommands.map(m => m).filter(m => m.subcommands.size);
			var ug = this.#bot.slashCommands.map(m => m).filter(m => !m.subcommands.size);
			for(var m of mods) {
				var e = {
					title: m.name.toUpperCase(),
					description: m.description
				}

				cmds = m.subcommands.map(o => o);
				var tmp = await this.#bot.utils.genEmbeds(this.#bot, cmds, (c) => {
					return {name: c.name, value: c.description}
				}, e, 10, {addition: ""})
				embeds = embeds.concat(tmp.map(e => e.embed))
			}

			if(ug?.[0]) {
				var e = {
					title: "UNGROUPED",
					description: "Miscellaneous commands",
					fields: []
				}

				for(var c of ug) e.fields.push({name: c.name, value: c.description});
				embeds.push(e)
			}
		} else {
			var name = "";
			var cm;
			if(mod) {
				cm = this.#bot.slashCommands.get(mod);
				if(!cm) return "Module not found!";
				cmds = cm.subcommands.map(o => o);
				name += (cm.name ?? cm.name) + " ";
			} else {
				cmds = this.#bot.slashCommands.map(c => c);
			}

			if(cmd) {
				cm = cmds.find(c => (c.name ?? c.name) == cmd);
				if(!cm) return "Command not found!";
				cmds = cm.subcommands?.map(o => o);
				name += `${cm.name ?? cm.name} `;

				if(scmd) {
					cm = cmds?.find(c => (c.name ?? c.name) == scmd);
					if(!cm) return "Subcommand not found!";
					name += `${cm.name ?? cm.name}`;
				}
			}

			if(cm.subcommands?.size) {
				embeds = await this.#bot.utils.genEmbeds(this.#bot, cm.subcommands.map(c => c), (c) => {
					return {name: `**/${name.trim()} ${c.name}**`, value: c.description}
				}, {
					title: name.toUpperCase(),
					description: cm.description,
					color: 0xee8833
				}, 10, {addition: ""})
				embeds = embeds.map(e => e.embed);
			} else {
				embeds = [{
					title: name,
					description: cm.description,
					fields: [],
					color: 0xee8833
				}]

				if(cm.usage?.length) embeds[embeds.length - 1].fields.push({
					name: "Usage",
					value: cm.usage.map(u => `/${name.trim()} ${u}`).join("\n")
				})

				if(cm.extra?.length) embeds[embeds.length - 1].fields.push({
					name: "Extra",
					value: cm.extra
				});
			}	
		}

		if(embeds.length > 1)
			for(var i = 0; i < embeds.length; i++)
				embeds[i].title += ` (${i+1}/${embeds.length})`;
		return embeds;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);