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

module.exports = (bot, stores) => new Command(bot, stores);