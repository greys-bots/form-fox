module.exports = {
	help: ()=> `List existing forms`,
	usage: ()=> [
		' - List all forms',
		' [form id] - View a specific form',
		' open - List open forms',
		' closed - List closed forms'
	],
	execute: async (bot, msg, args) => {
		var forms = await bot.stores.forms.getAll(msg.guild.id);
		if(!forms?.[0]) return "No forms created yet!";

		if(args[0]) {
			if(args[0].toLowerCase() == 'open') forms = forms.filter(f => f.open);
			else if(args[0].toLowerCase() == 'closed') forms = forms.filter(f => !f.open);
			else forms = forms.filter(f => f.hid == args[0].toLowerCase());
		}

		var embeds = [];

		for(var form of forms) {
			var channel = msg.guild.channels.resolve(form.channel_id);
			var roles = msg.guild.roles.cache.filter(r => form.roles.includes(r.id));
			var responses = await bot.stores.responses.getByForm(msg.guild.id, form.hid);

			var embed = {embed: {
				title: `${form.name} (${form.hid})`,
				description: [
					form.description + '\n',
					'**Message:** '+(form.message || '*(not set)*'),
					'**Channel:** '+(`${channel}` || '*(not set)*'),
					'**Response Count:** '+(responses?.length || '0'),
					'**Roles:**\n'+(roles.map(r => `${r}`).join('\n') || '*(none)*')
				].join('\n'),
				color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
				footer: {text: form.open ? '' : 'This form is closed!'}
			}}

			embed.embed.fields = form.questions.map((q, i) => {
				return {name: `Question ${i+1}${form.required?.includes(i+1) ? " (required)" : ""}`, value: q}
			})

			embeds.push(embed)
		}

		if(embeds.length > 1)
			for(var i = 0; i < embeds.length; i++)
				embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

		return embeds;
	},
	alias: ['list', 'l', 'f', 'form'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}