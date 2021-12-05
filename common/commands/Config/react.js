const { confirmReacts: REACTS } = require('../../extras');
const VALS = ["1", "true", "y", "yes", "enable", "✅"];

module.exports = {
	help: () => "Set if the bot should remove form reacts",
	usage: () =>[
		" - Views current values",
		" [true|false] - Sets the global value",
		" [form id] [val] - Sets the value for a form"
	],
	execute: async (bot, msg, args) => {
		var cfg = await bot.stores.configs.get(msg.channel.guild.id);
		var forms = await bot.stores.forms.getAll(msg.channel.guild.id);
		switch(args.length) {
			case 0:
				var embeds = [{embed: {
					title: 'Default settings',
					description: `${cfg.reacts ?? "*(not set)*"}`,
					color: parseInt('ee8833', 16)
				}}];

				if(!forms?.[0]) return embeds;

				embeds = embeds.concat(forms.map(f => {
					chan = msg.channel.guild.channels.cache.find(c => c.id == f.channel_id);
					return {embed: {
						title: `Value for form ${f.name} (${f.hid})`,
						description: `${form.reacts ?? "*(not set)*"}`,
						color: parseInt('ee8833', 16)
					}}
				}))

				if(embeds.length > 1)
					for(var i = 0; i < embeds.length; i++)
						embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

				return embeds;
				break;
			case 1:
				var val;
				if(VALS.includes(args[0].toLowerCase())) val = true;
				else val = false;

				if(!cfg.server_id) await bot.stores.configs.create(msg.channel.guild.id, {reacts: val});
				else await bot.stores.configs.update(msg.channel.guild.id, {reacts: val});

				return "Global config set!";
				break;
			case 2:
				var form = forms.find(f => f.hid == args[0].toLowerCase());
				if(!form) return 'Form not found!';

				var val;
				if(VALS.includes(args[1].toLowerCase())) val = true;
				else val = false;

				try {
					await bot.stores.forms.update(msg.channel.guild.id, form.hid, {reacts: val});
				} catch(e) {
					return "ERR! "+e;
				}

				return "Form config set!";
				break;
		}
	},
	guildOnly: true,
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_CONFIG'],
	alias: ['reactremove', 'reaction', 'reacts', 'reactions', 'rr']
}