module.exports = {
	help: ()=> `List existing responses`,
	usage: ()=> [
		' - View all received responses',
		' [form id] - View responses for a specific form',
		' <form id> accepted - List accepted responses',
		' <form id> denied - List denied responses',
		' <form id> pending - List pending responses',
		' <form id> from:[user id] - List responses from a certain user'
	],
	execute: async (bot, msg, args) => {
		var responses = await bot.stores.responses.getAll(msg.channel.guild.id);
		if(!responses?.[0]) return "No responses received yet!";

		if(args[0]) {
			if(!['accepted', 'denied', 'pending'].includes(args[0].toLowerCase())) {
				var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
				if(form) {
					responses = responses.filter(x => x.form.hid == form.hid);
					if(args[1] && args[1].startsWith('from:')) responses = responses.filter(x => x.user_id == args[1].replace('from:', ''));
				} else if(args[0].startsWith('from:')) responses = responses.filter(x => x.user_id == args[0].replace('from:', ''));
				else return 'Form not found!';
			}
			else if(args[0].toLowerCase() == 'accepted') responses = responses.filter(r => r.status == 'accepted');
			else if(args[0].toLowerCase() == 'denied') responses = responses.filter(r => r.status == 'denied');
			else if(args[0].toLowerCase() == 'pending') responses = responses.filter(r => r.status == 'pending');
		}

		if(!responses[0]) return 'No responses match that critera!';

		var embeds = [];
		for(var r of responses) {
			var color;
			switch(r.status) {
				case 'accepted':
					color = parseInt('55aa55', 16);
					break;
				case 'denied':
					color = parseInt('aa5555', 16);
					break;
				default:
					color = parseInt('ccaa55', 16)
			}

			var template = {
				title: `Response ${r.hid}`,
				description:
					`Form name: ${r.form.name}\n` +
					`Form ID: ${r.form.hid}\n` +
					`User: <@${r.user_id}>`,
				fields: [],
				color,
				footer: {text: `Response status: ${r.status}`},
				timestamp: new Date(r.received).toISOString()
			}

			var tmp = bot.handlers.response.buildResponseEmbeds(r, template);
			if(tmp.length > 1)  {
				for(var i = 0; i < tmp.length; i++) {
					if(i == 0) {
						tmp[i].title = `Response ${r.hid}`;
					} else {
						tmp[i].title = `Response ${r.hid} (cont.)`;
					}
				}
			}

			embeds = embeds.concat(tmp);
		}

		if(embeds.length > 1)
			for(var i = 0; i < embeds.length; i++)
				embeds[i].title += ` (${i+1}/${embeds.length})`;

		return embeds;
	},
	alias: ['resp', 'response', 'listresponses', 'listresponse', 'lr'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}