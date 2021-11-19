module.exports = {
	data: {
		name: 'channel',
		description: 'Set a response channel',
		options: [
			{
				name: 'channel',
				description: 'The channel to set',
				type: 7,
				required: true,
				channel_types: [0, 5, 10, 11, 12]
			},
			{
				name: 'form_id',
				description: "ID of a form to change",
				type: 3,
				required: false,
				autocomplete: true
			}
		]
	},
	usage: [
		"[channel] - Set the default response channel for all forms",
		"[channel] [form_id] - Set the response channel for a form"
	],
	async execute(ctx) {
		var farg = ctx.options.get('form_id')?.value.toLowerCase().trim();
		var chan = ctx.options.getChannel('channel');

		if(farg) {
			var form = await ctx.client.stores.forms.get(ctx.guildId, farg);
			if(!form) return 'Form not found!';

			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {channel_id: chan.id});
			return "Form updated!";
		}

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);
		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {response_channel: chan.id});
		else await ctx.client.stores.configs.update(ctx.guildId, {response_channel: chan.id});
		
		return "Config updated!";
	},
	async auto(ctx) {
		var foc = ctx.options.getFocused();
		if(!foc) return;
		foc = foc.toLowerCase()

		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	},
	guildOnly: true
}