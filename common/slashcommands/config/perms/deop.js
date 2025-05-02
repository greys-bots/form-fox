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

module.exports = (bot, stores) => new Command(bot, stores);