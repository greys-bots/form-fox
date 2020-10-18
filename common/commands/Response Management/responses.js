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
		var responses = await bot.stores.responses.getAll(msg.guild.id);
		if(!responses?.[0]) return "No responses received yet!";

		if(args[0]) {
			if(!['accepted', 'denied', 'pending'].includes(args[0].toLowerCase())) {
				var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
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

		for(var response of responses) {
			var user = await bot.users.fetch(response.user_id);
			var color;
			var questions = response.questions?.[0] ? response.questions : response.form.questions;
			if(response.status == 'accepted') color = parseInt('55aa55', 16);
			else if(response.status == 'denied') color = parseInt('aa5555', 16);
			else color = parseInt('ccaa55', 16);
			embeds.push({embed: {
				title: `Response ${response.hid}`,
				description: [
					`Form name: ${response.form.name}`,
					`Form ID: ${response.form.hid}`,
					`User: ${user}`
				].join('\n'),
				fields: questions.map((q, i) => {
					return {name: q.value, value: response.answers[i] || '*(answer skipped!)*'}
				}),
				color,
				footer: {text: `Response status: ${response.status}`},
				timestamp: new Date(response.received).toISOString()
			}})
		}

		if(embeds.length > 1)
			for(var i = 0; i < embeds.length; i++)
				embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

		return embeds;
	},
	alias: ['resp', 'response', 'listresponses', 'listresponse', 'lr'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}