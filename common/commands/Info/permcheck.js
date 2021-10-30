const { requiredPerms: REQUIRED } = require('../../extras');

module.exports = {
	help: () => "Check to see if the bot's permissions are set up correctly",
	usage: () => [
		" - Check all forms' channels for proper permissions",
		" [channel] - Check a specific channel for proper permissions"
	],
	async execute(bot, msg, args) {
		if(!args[0]) {
			var forms = await bot.stores.forms.getAll(msg.guild.id);
			var cfg = await bot.stores.configs.get(msg.guild.id);
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
					fields: readout(bot, chan)
				})
			}

			if(res.length > 1) for(var i = 0; i < res.length; i++)
				res[i].title += ` (page ${i+1}/${res.length})`;
			return res;
		}

		var chan = msg.guild.channels.cache.find(c => {
			var t = (
				[c.name.toLowerCase(), c.id].includes(
					args[0].toLowerCase()
					.replace(/[<#>]/g, '')
				) && c.type == "GUILD_TEXT"
			)
			return t;
		});
		if(!chan) return "Channel not found!";

		return {
			title: "Check Results",
			description: `Channel: <#${chan.id}>`,
			fields: readout(bot, chan)
		}
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
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