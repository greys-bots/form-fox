const { requiredPerms: REQUIRED } = require('../extras');

module.exports = {
	data: {
		name: 'permcheck',
		description: "Make sure the bot's permissions are set up correctly",
		options: [{
			name: 'channel',
			description: 'A channel to check',
			type: 7,
			channel_types: [0]
		}]
	},
	async execute(ctx) {
		var chan = ctx.options.getChannel('channel');
		if(!chan) {
			var forms = await ctx.client.stores.forms.getAll(msg.guild.id);
			var cfg = await ctx.client.stores.configs.get(msg.guild.id);
			if(!forms?.length && !cfg.response_channel) return "No forms or config to check! Provide a channel to check that";

			var check = [];
			if(cfg.response_channel) check.push(cfg.response_channel);
			for(var f of forms) {
				if(f.channel_id && !check.includes(f.channel_id))
					check.push(f.channel_id);
			}

			var res = [];
			for(var c of check) {
				var chan = msg.guild.channels.resolve(c);
				if(!chan) {
					res.push({
						title: "Check Results",
						description: `Channel: <#${c}>\n` +
							`**Can't view channel or channel doesn't exist**`
					})
					continue;
				}

				res.push({
					title: "Check Results",
					description: `Channel: <#${c}>`,
					fields: readout(ctx.client, chan)
				})
			}

			return res;
		}
	}
}

function readout(bot, chan) {
	var perms = chan.permissionsFor(bot.user.id).serialize();
	var fields = [
		{
			name: "Given permissions",
			value: ""
		},
		{
			name: "Missing permissions",
			value: ""
		}
	]
	
	for(var k of REQUIRED) {
		if(perms[k]) fields[0].value += `${k}\n`;
		else fields[1].value += `${k}\n`;
	}

	fields = fields.map(f => {
		f.value = f.value || "(none)";
		return f;
	})
	return fields;
}