module.exports = {
	name: 'form',
	description: 'Commands for managing forms',
	options: []
}

module.exports.options.push({
	name: 'view',
	description: 'View existing forms',
	type: 1,
	options: [
		{
			name: "form_id",
			description: "The form's ID",
			type: 3,
			required: false
		}
	],
	execute: async (ctx) => {
		var arg = ctx.options.get('form_id');
		if(!arg) {
			var forms = await ctx.client.stores.forms.getAll(ctx.guildId);
			if(!forms?.[0]) return 'No forms available';

			var embeds = [];
			for(var f of forms) {
				embeds.push({
					title: `${f.name} (${f.hid}) ` +
						   `${f.emoji?.includes(':') ? '<' + f.emoji + '>' : f.emoji || '📝'}`,
					description: f.description,
					fields: [
						{name: "Message", value: f.message || "*(not set)*"}
					],
					color: parseInt(!f.open ? 'aa5555' : f.color || '55aa55', 16)
				})
			}

			return embeds;
		}

		var form = await ctx.client.stores.forms.get(ctx.guildId, arg.value);
		if(!form) return 'Form not found!';

		return {embeds: [{
			title: `${form.name} (${form.hid}) ` +
				   `${form.emoji?.includes(':') ? '<' + form.emoji + '>' : form.emoji || '📝'}`,
			description: form.description,
			fields: [
				{name: "Message", value: form.message || "*(not set)*"}
			],
			color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16)
		}]}
	},
	ephemeral: true
})