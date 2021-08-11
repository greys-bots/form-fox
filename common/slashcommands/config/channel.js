module.exports = {
	data: {
		name: 'channel',
		description: 'Set a response channel',
		options: [
			{
				name: 'channel',
				description: 'The channel to set',
				type: 7,
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
		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {channel: channel.id});
		else await ctx.client.stores.configs.update(ctx.guildId, {channel: channel.id});
		
		return "Config updated!";
	}
}