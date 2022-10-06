const { opPerms: PERMS } = require('../../extras');
const {
	User,
	GuildMember,
	Role
} = require('discord.js');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'perms',
			description: "Manage bot admin permissions for users and roles",
			type: 2
		})

		this.#bot = bot;
		this.#stores = stores;
	}
}

class ViewCommand extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: "View current opped users and roles",
			type: 1,
			options: [{
				name: 'target',
				description: "A user or role permissions for",
				type: 9,
				required: false
			}],
			usage: [
				"- Views permissions for everything currently opped",
				"[target] - Views permissions for a specific target"
			],
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_OPS']
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var target = ctx.options.getMentionable('target');
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		if(!cfg?.opped || !Object.keys(cfg.opped).find(k => cfg.opped[k].length))
			return "No ops to view!";

		var ops;
		if(target) {
			ops = cfg.opped.users.filter(x => x.id == target.id);
			if(ops.length) {
				ops = ops.map(u => ({
					name: 'Opped user',
					value: `<@${u.id}>\n` +
						`**Perms:** ${u.perms.join(", ")}`
				}))
			} else {
				ops = cfg.opped.roles.filter(x => x.id == target.id);
				if(!ops?.length) return "Target not opped!";

				ops = ops.map(r => ({
					name: 'Opped role',
					value: `<@&${r.id}>\n` +
						`**Perms:** ${r.perms.join(", ")}`
				}))
			}
		} else {
			ops = cfg.opped.users.map(u => ({
				name: "Opped user",
				value: `<@${u.id}>\n` +
					`**Perms:** ${u.perms.join(", ")}`
			}))

			ops = ops.concat(cfg.opped.roles.map(r => ({
				name: "Opped role",
				value: `<@&${r.id}>\n` +
					`**Perms:** ${r.perms.join(", ")}`
			})))
		}

		var embeds = [];
		for(var i = 0; i < ops.length; i += 10) {
			embeds.push({
				title: "Opped",
				description: `**Permission descriptions:**\n` +
					'```\n' +
					Object.keys(PERMS).map(p => `${p} - ${PERMS[p]}`)
						.join('\n') +
					'\n```',
				fields: ops.slice(i, i+10)
			})
		}

		return embeds;
	}
}

class OpCommand extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "op",
			description: "Give a role or user access to admin commands",
			type: 1,
			options: [
				{
					name: 'target',
					description: "A user or role to op",
					type: 9,
					required: true
				}
			],
			usage: [
				'[target] - Opens a menu for opping the target'
			],
			extra: 'Permission descriptions:\n' + 
				Object.keys(PERMS).map(p => `${p} - ${PERMS[p]}`)
				.join('\n') +
				"NOTE: Users with the ManageMessages role permission " +
				"server-wide will be able to use all admin commands " +
				"regardless of permissions given here",
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_OPS']
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var target = ctx.options.getMentionable('target');
		if(target.id == ctx.user.id) return "You can't op yourself!";

		var cfg = await this.#stores.configs.get(ctx.guild.id);
		var opped = cfg?.opped ?? {users: [], roles: []};
		var obj = {};
		console.log(
			`Constructor name: ${target.constructor.name}`,
			`\nClass:`, Role,
			`\nInstance? ${target instanceof Role}`
		)
		if(!(
			target instanceof User ||
			target instanceof GuildMember ||
			target instanceof Role
		)) return "Invalid target! Please try again";
		obj.id = target.id;

		var sel = await this.#bot.utils.awaitSelection(
			ctx,
			Object.keys(PERMS).map(k => {
				return {
					label: k,
					value: k,
					description: PERMS[k]
				}
			}),
			"What permissions do you want the target to have?",
			{
				placeholder: "Select permissions",
				min_values: 1,
				max_values: Object.keys(PERMS).length
			}
		)

		if(typeof sel == 'string') return sel;
		obj.perms = sel;

		if(target instanceof Role) opped.roles.push(obj);
		else opped.users.push(obj);

		cfg.opped = opped;
		await cfg.save();
		
		return "Target opped!";
	}
}

class DeopCommand extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "deop",
			description: "Remove an existing op's access to admin commands",
			type: 1,
			options: [
				{
					name: 'target',
					description: "A user or role to de-op",
					type: 9,
					required: true
				}
			],
			usage: [
				'[target] - De-ops the target'
			],
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_OPS']
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var target = ctx.options.getMentionable('target');
		if(target.id == ctx.user.id) return "You can't de-op yourself!";
		
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		if(!cfg?.opped || !Object.keys(cfg.opped).find(k => cfg.opped[k].length))
			return "No ops to remove!";

		var opped = cfg.opped;
		if(!(
			target instanceof User ||
			target instanceof GuildMember ||
			target instanceof Role
		)) return "Invalid target! Please try again";

		if(target instanceof Role)
			opped.roles = opped.roles.filter(o => o.id != target.id);
		else opped.users = opped.users.filter(o => o.id != target.id);

		cfg.opped = opped;
		await cfg.save();
		
		return "Target de-opped!";
	}
}

class AddCommand extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "add",
			description: "Add permissions to an existing op",
			type: 1,
			options: [
				{
					name: 'target',
					description: "A user or role to update",
					type: 9,
					required: true
				},
				{
					name: 'perm',
					description: "The permission to add",
					type: 3,
					required: true,
					choices: Object.keys(PERMS).map(p => ({
						name: p,
						value: p
					}))
				}
			],
			usage: [
				"[target] - Add a permission to the given target"
			],
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_OPS']
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var target = ctx.options.getMentionable('target');
		var perm = ctx.options.getString('perm');
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		if(!cfg?.opped || !Object.keys(cfg.opped).find(k => cfg.opped[k].length))
			return "No ops to change!";

		var found;
		var index;
		if(target instanceof Role) {
			index = cfg.opped.roles.findIndex(r => r.id == target.id);
			if(index > -1) found = cfg.opped.roles[index];
		} else {
			index = cfg.opped.users.findIndex(u => u.id == target.id);
			if(index > -1) found = cfg.opped.users[index];
		}
		if(!found) return "Target not opped!";

		if(!found.perms.includes(perm)) found.perms.push(perm);
		cfg.opped[target instanceof Role ? "roles" : "users"].splice(index, 1, found);
		
		await cfg.save()
		return "Target updated!"
	}
}

class RemoveCommand extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "remove",
			description: "Remove permissions from an existing op",
			type: 1,
			options: [
				{
					name: 'target',
					description: "A user or role to update",
					type: 9,
					required: true
				},
				{
					name: 'perm',
					description: "The permission to remove",
					type: 3,
					required: true,
					choices: Object.keys(PERMS).map(p => ({
						name: p,
						value: p
					}))
				}
			],
			usage: [
				"[target] - Remove a permission from the given target"
			],
			guildOnly: true,
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_OPS']
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var target = ctx.options.getMentionable('target');
		var perm = ctx.options.getString('perm');
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		if(!cfg?.opped || !Object.keys(cfg.opped).find(k => cfg.opped[k].length))
			return "No ops to change!";

		var found;
		var index;
		if(target instanceof Role) {
			index = cfg.opped.roles.findIndex(r => r.id == target.id);
			if(index > -1) found = cfg.opped.roles[index];
		} else {
			index = cfg.opped.users.findIndex(u => u.id == target.id);
			if(index > -1) found = cfg.opped.users[index];
		}
		if(!found) return "Target not opped!";

		if(found.perms.includes(perm)) found.perms = found.perms.filter(x => x != perm);
		cfg.opped[target instanceof Role ? "roles" : "users"].splice(index, 1, found);

		await cfg.save()
		return "Target updated!"
	}
}

module.exports = (bot, stores) => {
	var cmd = new Command(bot, stores)
		.addSubcommand(new ViewCommand(bot, stores))
		.addSubcommand(new OpCommand(bot, stores))
		.addSubcommand(new DeopCommand(bot, stores))
		.addSubcommand(new AddCommand(bot, stores))
		.addSubcommand(new RemoveCommand(bot, stores));
	return cmd;
}