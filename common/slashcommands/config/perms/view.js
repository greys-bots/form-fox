const { opPerms: PERMS } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
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
			opPerms: ['MANAGE_OPS'],
			v2: true
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
					type: 10,
					content:
						`### Opped user\n` +
						`<@${u.id}>\n` +
						`**Perms:** ${u.perms.join(", ")}`
				}))
			} else {
				ops = cfg.opped.roles.filter(x => x.id == target.id);
				if(!ops?.length) return "Target not opped!";

				ops = ops.map(r => ({
					type: 10,
					content:
						`### Opped role\n` +
						`<@&${r.id}>\n` +
						`**Perms:** ${r.perms.join(", ")}`
				}))
			}
		} else {
			ops = cfg.opped.users.map(u => ({
				type: 10,
				content:
					`### Opped user\n` +
					`<@${u.id}>\n` +
					`**Perms:** ${u.perms.join(", ")}`
			}))

			ops = ops.concat(cfg.opped.roles.map(r => ({
				type: 10,
				content:
					`### Opped role\n` +
					`<@&${r.id}>\n` +
					`**Perms:** ${r.perms.join(", ")}`
			})))
		}

		var embeds = [];
		for(var i = 0; i < ops.length; i += 10) {
			embeds.push({
				components: [{
					type: 17,
					components: [
						{
							type: 10,
							content:
								`## Opped\n` +
								`**Permission descriptions:**\n` +
								'```\n' +
								Object.keys(PERMS).map(p => `${p} - ${PERMS[p]}`)
									.join('\n') +
								'\n```'	
						},
						...ops.slice(i, i+10)
					]
				}]
			})
		}

		return embeds;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);