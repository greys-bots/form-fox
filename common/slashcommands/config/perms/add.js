const { opPerms: PERMS } = require('../../../extras');
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

module.exports = (bot, stores) => new Command(bot, stores);