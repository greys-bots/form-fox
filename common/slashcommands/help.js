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
					name: 'command',
					description: "View help for a specific command in a module",
					type: 3,
					required: false,
					autocomplete: true
				}
			],
			usage: [
				"[command] - Get help for a command or group of commands"	
			],
			extra: "Examples:\n"+
				   "`/help command:form` - Shows form module help",
			ephemeral: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var cn = ctx.options.getString('command')?.toLowerCase().trim();

		var embeds = [];
		var cmds;
		if(!cn) {
			embeds = [{
				components: [{
					type: 17,
					accent_color: 0xee8833,
					components: [
						{
							type: 10,
							content: `Command Help`
						},
						{
							type: 14,
							spacing: 2
						},
						{
							type: 10,
							content:
								"# Eee! I'm Fox!\n" +
								"I help you make and manage forms here on discord! Here are some of my features:\n" +
								"## Interaction-based interface\n" +
								"Many of my functions are based on buttons and reactions! This keeps typing to a minimum\n" +
								"## Multiple question types\n" +
								'I currently support a variety of question types, including:' +
									'\n- Multiple choice' +
									'\n- Checkbox' +
									'\n- Freeform' +
									'\n- Attachment' +
									'\n- Specific formats' +
									'\n\nAll of these are also created to be accessible and can be handled using interactions and typing!\n' +
								"## Multiple forms per server\n" +
								"Servers can have multiple forms set up at the same time!\n" +
								"## Individual form customization\n" +
								'Every form can have the following customized:' +
									'\n- A name and description' +
									'\n- An acceptance message' +
									'\n- Roles added to users once accepted' +
									'\n- What channel responses go to' +
									'\n- A custom color, thumbnail, and banner' +
									'\n- Custom button text, emoji, and style!\n' +
								"## Answer-based roles\n" +
								"In addition to form customization, you can also " +
									"set up roles to be added based on a user's answers!\n" +
									"For example, you can automatically give users an `Adult` " +
									"role if they answer your form's age question with a " +
									"number over 18",
						},
						{
							type: 14,
							spacing: 2
						},
						{
							type: 1,
							components: [
								{
									type: 2,
									style: 5,
									label: 'Support Server',
									url: 'https://discord.gg/EvDmXGt'
								},
								{
									type: 2,
									style: 5,
									label: 'Patreon',
									url: 'https://patreon.com/greysdawn'
								},
								{
									type: 2,
									style: 5,
									label: 'Ko-Fi',
									url: 'https://ko-fi.com/greysdawn'
								},
							],
						}
					]	
				}]
			}];
			
			var mods = this.#bot.slashCommands.map(m => m).filter(m => m.subcommands.size);
			var ug = this.#bot.slashCommands.map(m => m).filter(m => !m.subcommands.size);
			for(let m of mods) {
				let e = {
					components: [{
						type: 17,
						accent_color: 0xee8833,
						components: [{
							type: 10,
							content: `# ${m.name.toUpperCase()}\n${m.description}`
						}]
					}]
				}

				cmds = m.subcommands.map(o => o);
				cmds.forEach(c => {
					e.components[0].components.push({
						type: 10,
						content: `### /${m.name} ${c.name}\n${c.description}`
					})
				})
				embeds.push(e);
			}

			if(ug?.[0]) {
				var e = {
					components: [{
						type: 17,
						accent_color: 0xee8833,
						components: [{
							type: 10,
							content: `# UNGROUPED\nMiscellaneous commands`
						}]
					}]
				}

				for(var c of ug) e.components[0].components.push({
					type: 10,
					content: `### /${c.name}\n${c.description}`
				});
				embeds.push(e)
			}
		} else {
			var name = cn;
			var [mod, cmd, scmd] = cn.split(" ");
			var cm;
			if(mod) {
				cm = this.#bot.slashCommands.get(mod);
				if(!cm) return "Module not found!";
				cmds = cm.subcommands.map(o => o);
			} else {
				cmds = this.#bot.slashCommands.map(c => c);
			}

			if(cmd) {
				cm = cmds.find(c => (c.name ?? c.name) == cmd);
				if(!cm) return "Command not found!";
				cmds = cm.subcommands?.map(o => o);

				if(scmd) {
					cm = cmds?.find(c => (c.name ?? c.name) == scmd);
					if(!cm) return "Subcommand not found!";
				}
			}

			if(cm.subcommands?.size) {
				let e = {
					components: [{
						type: 17,
						accent_color: 0xee8833,
						components: [{
							type: 10,
							content: `# ${name.toUpperCase()}\n${cm.description}`
						}]
					}]
				}

				cm.subcommands.map(o => o).forEach(c => {
					e.components[0].components.push({
						type: 10,
						content: `### /${name.trim()} ${c.name}\n${c.description}`
					})
				})

				embeds = [e];
			} else {
				let e = {
					components: [{
						type: 17,
						accent_color: 0xee8833,
						components: [{
							type: 10,
							content: `# /${name}\n${cm.description}`
						}]
					}]
				}

				if(cm.usage?.length) e.components[0].components.push({
					type: 10,
					content: `### Usage\n` + cm.usage.map(u => `/${name.trim()} ${u}`).join("\n")
				})

				if(cm.extra?.length) e.components[0].components.push({
					type: 10,
					content: `### Extra\n` + cm.extra
				})

				if(cm.permissions?.length) e.components[0].components.push({
					type: 10,
					content: `### Permissions\n` + cm.permissions.join(", ")
				})

				embeds = [e];
			}	
		}

		return embeds;
	}

	async auto(ctx) {
		var names = this.#bot.slashNames;
		var foc = ctx.options.getFocused();
		var res;
		if(!foc) res = names.map(n => ({ name: n, value: n }));
		else {
			foc = foc.toLowerCase()

			res = names.filter(n =>
				n.includes(foc)
			).map(n => ({
				name: n,
				value: n
			}))
		}

		return res.slice(0, 25);
	}
}

module.exports = (bot, stores) => new Command(bot, stores);