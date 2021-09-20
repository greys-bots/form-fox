module.exports = {
	data: {
		name: "embed",
		description: "Change if the info embed is sent when applying to a form",
		options: [
			{
				name: 'value',
				description: 'The value for whether the embed is sent',
				type: 5,
				required: true
			},
			{
				name: 'form_id',
				description: "ID of a form to change",
				type: 3,
				required: false
			}
		]
	},
	usage: [
		"[value] - Set the default value for all forms",
		"[value] [form_id] - Set the value for a form"
	],
	extra: "The info embed is a list of questions sent when a user applies to a form. "+
		   "By default this setting is TRUE, so it sends the embed. " +
		   "Set it to false to turn it off",
	async execute(ctx) {
		var val = ctx.options.getBoolean('value');
		var farg = ctx.options.get('form_id')?.value.toLowerCase().trim();

		if(farg) {
			var form = await ctx.client.stores.forms.get(ctx.guildId, farg);
			if(!form) return 'Form not found!';

			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {embed: val});
			return "Form updated!";
		}

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);
		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {embed: val});
		else await ctx.client.stores.configs.update(ctx.guildId, {embed: val});
		
		return "Config updated!";
	}
}