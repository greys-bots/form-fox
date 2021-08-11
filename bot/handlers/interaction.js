const { Collection } = require('discord.js');

class InteractionHandler {
	menus = new Collection();

	constructor(bot) {
		this.bot = bot;

		bot.on('interactionCreate', (interaction) => {
			this.handle(interaction);
		})

		bot.once('ready', async () => {
			await this.load(__dirname + '/../../common/slashcommands');
			console.log('slash commands loaded!')
		})
	}

	async load(path) {
		var slashCommands = new Collection();
		var slashData = new Collection();

		var files = this.bot.utils.recursivelyReadDirectory(path);

		for(f of files) {
			var path_frags = f.replace(path, "").split(/(?:\\|\/)/);
			var mods = path_frags.slice(1, -1);
			var file = path_frags[path_frags.length - 1];
			if(file == '__mod.js') continue;
			delete require.cache[require.resolve(f)];
			var command = require(f);

			var {
				execute,
				ephemeral,
				perms,
				guildOnly,
				ownerOnly,
				...data
			} = command;
			if(command.options) {
				var d2 = command.options.map(({execute, ephemeral, perms, guildOnly, ...o}) => o);
				data.options = d2;
			}

			if(mods[0]) {
				var group = slashCommands.get(mods[0]);
				var g2 = slashData.get(mods[0]);
				if(!group) {
					var mod;
					delete require.cache[require.resolve(f.replace(file, "/__mod.js"))];
					mod = require(f.replace(file, "/__mod.js"));
					group = {
						...mod,
						options: [],
						type: 1
					};
					g2 = {
						...mod,
						options: [],
						type: 1
					};

					slashCommands.set(mod.name, group);
					slashData.set(mod.name, g2);
				}

				group.options.push(command)
				g2.options.push({
					...data,
					type: data.type ?? 1
				})
			} else {
				slashCommands.set(command.name, command);
				slashData.set(command.name, data)
			}
		}

		this.bot.slashCommands = slashCommands;

		try {
			if(!this.bot.application?.owner) await this.bot.application?.fetch();

			var cmds = slashData.map(d => d);
			await this.bot.application.commands.set(cmds, process.env.COMMAND_GUILD);
			return;
		} catch(e) {
			console.log(e);
			return Promise.reject(e);
		}
	}

	async handle(ctx) {
		if(ctx.isCommand() || ctx.isContextMenu()) this.handleCommand(ctx);
		if(ctx.isButton()) this.handleButtons(ctx);
		if(ctx.isSelectMenu()) this.handleSelect(ctx);
	}

	parse(ctx) {
		var cmd = this.bot.slashCommands.get(ctx.commandName);
		if(!cmd) return;

		if(ctx.options.getSubcommandGroup(false)) {
			cmd = cmd.options.find(o => o.name == ctx.options.getSubcommandGroup());
			if(!cmd) return;
			var opt = ctx.options.getSubcommand(false);
			if(opt) {
				cmd = cmd.options.find(o => o.name == opt);
			} else return;
		} else if(ctx.options.getSubcommand(false)) {
			cmd = cmd.options.find(o => o.name == ctx.options.getSubcommand());
			if(!cmd) return;
		}

		return cmd;
	}

	async handleCommand(ctx) {
		var cmd = this.parse(ctx);
		if(!cmd) return;

		var check = this.checkPerms(cmd, ctx);
		if(!check) return await ctx.reply({
			content: "You don't have permission to use this command!",
			ephemeral: true
		});
		if(cmd.guildOnly && !ctx.guildId) return await ctx.reply({
			content: "That command is guild only!",
			ephemeral: true
		})
		
		try {
			var res = await cmd.execute(ctx);
		} catch(e) {
			console.error(e);
			if(ctx.replied) return await ctx.followUp({content: "Error:\n" + e.message, ephemeral: true});
			else return await ctx.reply({content: "Error:\n" + e.message, ephemeral: true});
		}

		if(!res) return;

		var type = ctx.replied ? 'followUp' : 'reply'; // ew gross but it probably works
		switch(typeof res) {
			case 'string':
				return await ctx[type]({content: res, ephemeral: cmd.ephemeral ?? false})
			case 'object':
				if(Array.isArray(res)) {
					var reply = {
						embeds: [res[0]],
						ephemeral: cmd.ephemeral ?? false
					};
					if(!res[1]) return await ctx[type](reply);

					reply = {
						...reply,
						components: [
							{
								type: 1,
								components: [
									{
										type: 2,
										label: "First",
										style: 1,
										custom_id: 'first'
									},
									{
										type: 2,
										label: 'Previous',
										style: 1,
										custom_id: 'prev'
									},
									{
										type: 2,
										label: 'Next',
										style: 1,
										custom_id: 'next'
									},
									{
										type: 2,
										label: 'Last',
										style: 1,
										custom_id: 'last'
									}
								]
							}
						]
					}
					await ctx[type](reply);
					var message = await ctx.editReply(reply);

					var menu = {
						user: ctx.user.id,
						interaction: ctx,
						data: res,
						index: 0,
						timeout: setTimeout(() => {
							if(!this.menus.get(message.id)) return;
							this.menus.delete(message.id);
						}, 5 * 60000)
					}

					this.menus.set(message.id, menu);

					return;
				}

				return await ctx[type]({...res, ephemeral: (res.ephemeral ?? cmd.ephemeral) ?? false})
		}
	}

	async handleButtons(ctx) {
		var {message} = ctx;

		if(!this.menus.get(message.id)) return;

		var menu = this.menus.get(message.id);
		this.paginate(menu, ctx);
	}

	async handleSelect(ctx) {
		var {message} = ctx;

		if(!this.menus.get(message.id)) return;

		var menu = this.menus.get(message.id);
		menu.handle(ctx);
	}

	checkPerms(cmd, ctx) {
		if(cmd.ownerOnly && ctx.user.id !== process.env.OWNER)
			return false;
		if(ctx.guildOnly && !ctx.member) return false; // pre-emptive in case of dm slash cmds
		if(!cmd.perms || !cmd.perms[0]) return true;
		return ctx.member.permissions.has(cmd.permissions);
	}

	async paginate(menu, ctx) {
		var {data} = menu;
		var {customId: id} = ctx;

		switch(id) {
			case 'first':
				menu.index = 0;
				break;
			case 'prev':
				if(menu.index == 0) {
					menu.index = data.length - 1;
				} else menu.index = (menu.index - 1) % data.length;
				break;
			case 'next':
				menu.index = (menu.index + 1) % data.length;
				break;
			case 'last':
				menu.index = data.length -1;
				break;
		}

		await ctx.update({
			embeds: [data[menu.index]]
		})
	}
}

module.exports = (bot) => new InteractionHandler(bot);