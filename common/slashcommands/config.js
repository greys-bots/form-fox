module.exports = {
	name: 'config',
	description: "Commands for configuring options",
	options: []
}

module.exports.options.push({
	name: 'channel',
	description: 'Set a response channel',
	options: [
		{
			name: 'form_id',
			description: "ID of a form to change",
			type: 3,
			required: 'false'
		},
		{
			name: 'channel',
			description: 'The channel to set',
			type: 7,
			required: true
		}
	],
	async execute(ctx) {
		var farg = ctx.options.get('form_id');
		var chan = ctx.options.get('channel');

		if(farg) {
			var form = await ctx.client.stores.forms.get(ctx.guildId);
			if(!form) return 'Form not found!';
		}

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);
		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {channel: channel.channel.id});
	}
})