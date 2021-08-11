module.exports = {
	name: 'view',
	description: 'View existing forms',
	options: [
		{
			name: "form_id",
			description: "The form's ID",
			type: 3,
			required: false
		}
	],
	execute: async (ctx) => {
		var arg = ctx.options.get('form_id').value.toLowerCase().trim();
		if(!arg) {
			var forms = await ctx.client.stores.forms.getAll(ctx.guildId);
			if(!forms?.[0]) return 'No forms available';

			var embeds = [];
			for(var f of forms) {
				var responses = await ctx.client.stores.responses.getByForm(ctx.guildId, f.hid);
				embeds.push({
					title: `${f.name} (${f.hid}) ` +
						   `${f.emoji?.includes(':') ? '<' + f.emoji + '>' : f.emoji || '📝'}`,
					description: f.description,
					fields: [
						{name: "Message", value: f.message || "*(not set)*"},
						{name: "Channel", value: f.channel_id ? `<#${f.channel_id}>` : '*(not set)*'},
						{name: "Response count", value: responses?.length.toString() || "0"},
						{name: "Roles", value: f.roles?.[0]? f.roles.map(r => `<@&${r}>`).join("\n") : "*(not set)*"}
					],
					color: parseInt(!f.open ? 'aa5555' : f.color || '55aa55', 16)
				})
			}

			if(embeds.length > 1) for(var i = 0; i < embeds.length; i++) embeds[i].title += ` (${i+1}/${embeds.length})`;
			return embeds;
		}

		var form = await ctx.client.stores.forms.get(ctx.guildId, arg.value);
		if(!form) return 'Form not found!';

		var responses = await ctx.client.stores.responses.getByForm(ctx.guildId, form.hid);
		return {embeds: [{
			title: `${form.name} (${form.hid}) ` +
				   `${form.emoji?.includes(':') ? '<' + form.emoji + '>' : form.emoji || '📝'}`,
			description: form.description,
			fields: [
				{name: "Message", value: form.message || "*(not set)*"},
				{name: "Channel", value: form.channel_id ? `<#${form.channel_id}>` : '*(not set)*'},
				{name: "Response count", value: responses?.length.toString() || "0"},
				{name: "Roles", value: form.roles?.[0]? form.roles.map(r => `<@&${r}>`).join("\n") : "*(not set)*"}
			],
			color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16)
		}]}
	},
	ephemeral: true
}