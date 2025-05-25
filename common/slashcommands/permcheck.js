const { requiredPerms: REQUIRED } = require('../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: "permcheck",
			description: "Check to see if the bot's permissions are set up correctly",
			options: [{
				name: 'channel',
				description: "A channel to check permissions of",
				type: 7,
				channel_types: [0],
				required: false
			}],
			usage: [
				"[channel] - Check a specific channel for proper permissions"
			],
			permissions: ['ManageMessages'],
			guildOnly: true,
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var chan = ctx.options.getChannel('channel');

		if(chan) {
			return [{
				components: [{
					type: 17,
					components: [
						{
							type: 10,
							content: `## Check Results\n**Channel:** <#${chan.id}>`
						},
						...this.readout(this.#bot, chan)
					]
				}]
			}]
		}
		
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
		var cfg = await this.#stores.configs.get(ctx.guild.id);
		if(!forms?.length && !cfg.response_channel) return "No forms or config to check! Provide a channel to check that";

		var check = [];
		if(cfg.response_channel) check.push(cfg.response_channel);
		for(var f of forms) {
			if(f.channel_id && !check.includes(f.channel_id))
				check.push(f.channel_id);
		}

		var res = [];
		for(var c of check) {
			var ch = ctx.guild.channels.resolve(c);
			if(!ch) {
				res.push({
					components: [{
						type: 17,
						components: [{
							type: 10,
							content:
								`## Check Results\n` +
								`Channel: <#${c}>\n` +
								`**Can't view channel or channel doesn't exist**`
						}]
					}] 
				})
				continue;
			}

			res.push({
				components: [{
					type: 17,
					components: [
						{
							type: 10,
							content: `## Check Results\n**Channel:** <#${ch.id}>`
						},
						...this.readout(this.#bot, ch)
					]
				}]
			})
		}

		return res;
	}

	readout(bot, chan) {
		var perms = chan.permissionsFor(bot.user.id).serialize();
		let added = [0, 0]
		var fields = [
			{
				type: 10,
				content: "### Given permissions\n",
			},
			{
				type: 10,
				content: "### Missing permissions\n"
			}
		]
		
		for(var k of REQUIRED) {
			if(perms[k]) {
				added[0] += 1;
				fields[0].content += `${k}\n`;
			} else {
				added[1] += 1;
				fields[1].content += `${k}\n`;
			}
		}

		if(added[0] == 0) fields[0].content += `(none)`;
		if(added[1] == 0) fields[1].content += `(none)`;

		return fields;
	}
}

module.exports = (bot, stores) => new Command(bot, stores);