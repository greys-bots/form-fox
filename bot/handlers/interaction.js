const { Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { pageBtns: PAGE } = require('../../common/extras');

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

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
		var slashCommands = new Collection(); // actual commands, with execute data
		var slashData = new Collection(); // just what gets sent to discord
		var devOnly = new Collection(); // slashData: dev edition

		var files = this.bot.utils.recursivelyReadDirectory(path);

		for(var f of files) {
			var path_frags = f.replace(path, "").split(/(?:\\|\/)/); // get fragments of path to slice up
			var mods = path_frags.slice(1, -1); // the module names (folders SHOULD = mod name)
			var file = path_frags[path_frags.length - 1]; // the actual file name
			if(file == '__mod.js') continue; // ignore mod files, only load if command exists
			delete require.cache[require.resolve(f)]; // for reloading
			
			var command = require(f); // again, full command data
			var {data} = command; // what gets sent to discord
			if(command.options) {
				// map options into data for discord
				var d2 = command.options.map(({data: d}) => d);
				data.options = d2;
			}

			// if the commands are part of modules,
			// then we need to nest them into those modules for parsing
			if(mods.length) {
				let curmod; // current FULL module data
				let curdat; // current discord-only module data
				for(var i = 0; i < mods.length; i++) {
					var group; // the mod we're using. basically curmod but for this loop
					var g2; // discord-only data again
					if(!curmod) {
						// start of loop, set up group and current mod
						curmod = slashCommands.get(mods[i]);
						group = curmod;
						curdat = slashData.get(mods[i]);
						g2 = curdat;
					} else {
						// just get the group out of the curmod's options (/nesting)
						group = curmod.options.find(x => x.data.name == mods[i]);
						g2 = curdat.options.find(x => x.name == mods[i]);
					}

					if(!group) {
						// no group data? we need to create it
						var mod;
						delete require.cache[require.resolve(path + `/${mods.slice(0, i + 1).join("/")}/__mod.js`)];
						mod = require(path + `/${mods.slice(0, i + 1).join("/")}/__mod.js`);
						group = {
							...mod,
							options: [],
							type: mod.data.type ?? 1
						};
						g2 = {
							...mod.data,
							options: [],
							type: mod.data.type ?? 1
						};

						if(!curmod) {
							// start of loop again, also means we can
							// safely set this as a top-level command in our collections
							slashCommands.set(mod.data.name, group);
							if(mod.dev) devOnly.set(mod.data.name, g2);
							else slashData.set(mod.data.name, g2);
						} else {
							// otherwise it belongs nested below the current module data
							curmod.options.push(group);
							curdat.options.push(g2);
						}
					}

					// set the current mod to the group so we have proper nesting for
					// the next group or command
					curmod = group;
					curdat = g2;
				}

				// inherit permissions from parent module
				command.permissions = command.permissions ?? curmod.permissions;
				command.opPerms = command.opPerms ?? curmod.opPerms;
				command.guildOnly = command.guildOnly ?? curmod.guildOnly;

				curmod.options.push(command) // nest the command
				if(curmod.dev) {
					// okay not actually sure what to do about this part lol
					// TODO: figure out how to handle dev commands before going live
					var dg = devOnly.get(curmod.data.name);
					dg.options.push({
						...data,
						type: data.type ?? 1
					});
				} else {
					// if it's not a dev command then we can add it to the discord-only data
					curdat.options.push({
						...data,
						type: data.type ?? 1
					})
				}
			} else {
				// no mods? just make it top-level
				slashCommands.set(command.data.name, command);
				slashData.set(command.data.name, data)
			}
		}

		this.bot.slashCommands = slashCommands; // for safe keeping

		// all of below is just sending it off to discord
		try {
			if(!this.bot.application?.owner) await this.bot.application?.fetch();

			var cmds = slashData.map(d => d);
			var dcmds = devOnly.map(d => d);
			if(process.env.COMMAND_GUILD == process.env.DEV_GUILD) {
				cmds = cmds.concat(dcmds);
				await rest.put(
					Routes.applicationGuildCommands(this.bot.application.id, process.env.COMMAND_GUILD),
					{ body: cmds },
				);

				await rest.put(
					Routes.applicationCommands(this.bot.application.id),
					{ body: [] }
				)
			} else {
				if(process.env.COMMAND_GUILD) {
					await rest.put(
						Routes.applicationGuildCommands(this.bot.application.id, process.env.COMMAND_GUILD),
						{ body: cmds },
					);

					await rest.put(
						Routes.applicationCommands(this.bot.application.id),
						{ body: [] }
					)
				} else {
					await rest.put(
						Routes.applicationCommands(this.bot.application.id),
						{ body: cmds },
					);
				}
	
				await rest.put(
					Routes.applicationGuildCommands(this.bot.application.id, process.env.DEV_GUILD),
					{ body: dcmds },
				);
			}
			return;
		} catch(e) {
			console.log(e);
			return Promise.reject(e);
		}
	}

	async handle(ctx) {
		if(ctx.isAutocomplete()) this.handleAuto(ctx);
		if(ctx.isCommand() || ctx.isContextMenu()) this.handleCommand(ctx);
		if(ctx.isButton()) this.handleButtons(ctx);
		if(ctx.isSelectMenu()) this.handleSelect(ctx);
	}

	parse(ctx) {
		var long = "";
		var cmd = this.bot.slashCommands.get(ctx.commandName);
		if(!cmd) return;
		long += cmd.name ?? cmd.data.name;

		if(ctx.options.getSubcommandGroup(false)) {
			cmd = cmd.options.find(o => o.data.name == ctx.options.getSubcommandGroup());
			if(!cmd) return;
			long += ` ${cmd.data.name}`;
			var opt = ctx.options.getSubcommand(false);
			if(opt) {
				cmd = cmd.options.find(o => o.data.name == opt);
				if(cmd) long += ` ${cmd.data.name}`;
			} else return;
		} else if(ctx.options.getSubcommand(false)) {
			cmd = cmd.options.find(o => o.data.name == ctx.options.getSubcommand());
			if(!cmd) return;
			long += ` ${cmd.data.name}`;
		}

		if(cmd) cmd.long = long;
		return cmd;
	}

	async handleCommand(ctx) {
		var cmd = this.parse(ctx);
		if(!cmd) return;

		var cfg;
		if(ctx.guild) cfg = await ctx.client.stores.configs.get(ctx.guild.id);

		var check = this.checkPerms(cmd, ctx, cfg);
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

		var type;
		if(ctx.deferred) type = 'editReply';
		else type = ctx.replied ? 'followUp' : 'reply'; // ew gross but it probably works
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
								components: PAGE(1, res.length)
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
						}, 5 * 60000),
						handle: (ctx) => this.paginate(menu, ctx)
					}

					this.menus.set(message.id, menu);

					return;
				}

				return await ctx[type]({...res, ephemeral: (res.ephemeral ?? cmd.ephemeral) ?? false})
		}
	}

	async handleButtons(ctx) {
		var {message} = ctx;
		var menu = this.menus.get(message.id);
		if(!menu) return;

		menu.handle(ctx);
	}

	async handleSelect(ctx) {
		var {message} = ctx;
		var menu = this.menus.get(message.id);
		if(!menu) return;

		menu.handle(ctx);
	}

	async handleAuto(ctx) {
		var cmd = this.parse(ctx);
		if(!cmd) return;

		var result = await cmd.auto(ctx);
		return await ctx.respond(result ?? []);
	}

	checkPerms(cmd, ctx, cfg) {
		if(cmd.ownerOnly && ctx.user.id !== process.env.OWNER)
			return false;
		if(cmd.guildOnly && !ctx.member) return false; // pre-emptive in case of dm slash cmds

		if(!cmd.permissions?.length) return true; // no perms also means no opPerms
		if(ctx.member.permissions.has(cmd.permissions))
			return true;

		var found = this.findOpped(ctx.member ?? ctx.user, cfg?.opped)
		if(found && cmd.opPerms){			
			return (cmd.opPerms.filter(p => found.perms.includes(p))
					.length == cmd.opPerms.length);
		}

		return false;
	}

	findOpped(user, opped) {
		if(!opped || !user) return;

		var f = opped.users?.find(u => u.id == user.id);
		if(f) return f;

		if(user.roles) {
			f = opped.roles.find(r => user.roles.cache.has(r.id));
			if(f) return f;
		}

		return;
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
			embeds: [data[menu.index]],
			components: [{
				type: 1,
				components: PAGE(menu.index + 1, data.length)
			}]
		})
	}
}

module.exports = (bot) => new InteractionHandler(bot);