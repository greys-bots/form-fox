const { Collection } = require('discord.js');

class InteractionHandler {
	menus = new Collection();

	constructor(bot) {
		this.bot = bot;

		bot.on('interactionCreate', (interaction) => {
			this.handle(interaction);
		})

		bot.once('ready', async () => {
			await this.load(__dirname + '../../../common/slashcommands');
			console.log('slash commands loaded!')
		})
	}

	async load(path) {
		var slashGroups = new Collection();
		var slashCommands = new Collection();

		var files = this.bot.utils.recursivelyReadDirectory(path);

		for(f of files) {
			var path_frags = f.replace(path, "").split(/(?:\\|\/)/);
			var mods = path_frags.slice(0, -1);
			var file = path_frags[path_frags.length - 1];
			var command = require(f);

			if(mods[0]) {
				var group = slashGroups.get(mods[0]);
				if(!group) {
					var mod;
					if(file == '__mod.js') mod = require(f);
					else mod = require(path + "/" + mods[0] + "/__mod.js");

					//finish auto-loading groups here
				}
			}
			command.name = file.slice(0, -3).toLowerCase();
			slashCommands.set(command.name, command);
		}

		this.bot.slashCommands = slashCommands;

		try {
			if(!this.bot.application?.owner) await this.bot.application?.fetch();

			var cmds = this.bot.slashCommands.map(({execute, ephemeral, ...data}) => data);
			await this.bot.application.commands.set(cmds, process.env.COMMAND_GUILD);
			return;
		} catch(e) {
			console.log(e);
			return Promise.reject(e);
		}
	}

	async handle(ctx) {
		if(ctx.isCommand()) this.handleCommand(ctx);
		if(ctx.isButton()) this.handleButtons(ctx);
		if(ctx.isSelectMenu()) this.handleSelect(ctx);
	}

	async handleCommand(ctx) {
		var {commandName} = ctx;

		var cmd = this.bot.slashCommands.get(commandName);
		if(!cmd) return;

		try {
			var res = await cmd.execute(ctx);
		} catch(e) {
			console.error(e);
			return await ctx.reply({content: "Error:\n" + e.message, ephemeral: true})
		}

		if(res) {
			switch(typeof res) {
				case 'string':
					return await ctx.reply({content: res, ephemeral: cmd.ephemeral ?? false})
				case 'object':
					if(Array.isArray(res)) {
						var reply = {
							embeds: [res[0]],
							ephemeral: cmd.ephemeral ?? false
						};
						if(!res[1]) return await ctx.reply(reply);

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
						await ctx.reply(reply);
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

					if(typeof res.ephemeral == "boolean") return await ctx.reply(res);
					else return await ctx.reply({...res, ephemeral: cmd.ephemeral ?? false})
			}
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

	async paginate(menu, ctx) {
		var {data, interaction} = menu;
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