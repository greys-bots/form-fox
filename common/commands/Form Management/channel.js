module.exports = {
	help: ()=> `Sets the default channel for new forms' responses, or sets the channel for a specific form`,
	usage: ()=> [
		' - Views current channel configs',
		' [channel] - Sets the default channel for new forms\' responses',
		' [form id] [channel] - Sets the response channel for a specific form'
	],
	execute: async (bot, msg, args) => {
		switch(args.length) {
			case 0:
				var cfg = await bot.stores.configs.get(msg.guild.id);
				var forms = await bot.stores.forms.getAll(msg.guild.id);
				var chan = msg.guild.channels.cache.find(c => c.id == cfg?.response_channel);
				var embeds = [{embed: {
					title: 'Default settings',
					description: `${chan || "*(not set)*"}`,
					color: parseInt('ee8833', 16)
				}}];

				if(!forms?.[0]) return embeds;

				embeds = embeds.concat(forms.map(f => {
					chan = msg.guild.channels.cache.find(c => c.id == f.channel_id);
					return {embed: {
						title: `Channel for form ${f.name} (${f.hid})`,
						description: `${chan || "*(not set)*"}`,
						color: parseInt('ee8833', 16)
					}}
				}))

				if(embeds.length > 1)
					for(var i = 0; i < embeds.length; i++)
						embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

				return embeds;
				break;
			case 1:
				var cfg = await bot.stores.configs.get(msg.guild.id);
				var channel = msg.guild.channels.cache
							  .find(c => [c.name, c.id].includes(args[0].toLowerCase().replace(/[<@#>]/g, "")));
				if(!channel) return "Channel not found!";

				try {
					if(cfg) await bot.stores.configs.update(msg.guild.id, {response_channel: channel.id});
					else await bot.stores.configs.create(msg.guild.id, {response_channel: channel.id});
				} catch(e) {
					return "ERR! "+e;
				}

				return "Global channel set!";
				break;
			case 2:
				var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
				if(!form) return 'Form not found!';

				var channel = msg.guild.channels.cache
							  .find(c => [c.name, c.id].includes(args[1].toLowerCase().replace(/[<@#>]/g, "")));
				if(!channel) return "Channel not found!";

				try {
					await bot.stores.forms.update(msg.guild.id, form.hid, {channel_id: channel.id});
				} catch(e) {
					return "ERR! "+e;
				}

				return "Form channel set!";
				break;
		}
	},
	alias: ['ch', 'chan'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}