module.exports = {
	data: {
		name: 'status',
		description: "Check the status of a response",
		options: [
			{
				name: 'response_id',
				description: "The response's ID",
				type: 3,
				required: true
			},
			{
				name: 'guild_id',
				description: "The guild's ID",
				type: 3,
				required: false
			}
		]
	},
	async execute(ctx) {
		var id = ctx.options.getString('response_id').toLowerCase().trim();
		var gid = ctx.options.getString('guild_id', false);
		var resp = await ctx.client.stores.responses.get(gid ?? ctx.guildId, id);;
		if(!resp) return 'Response not found!';

		var color;
		switch(resp.status) {
			case 'accepted':
				color = parseInt('55aa55', 16);
				break;
			case 'denied':
				color = parseInt('aa5555', 16);
				break;
			default:
				color = parseInt('ccaa55', 16)
		}

		return {embeds: [{
			title: 'Response Status',
			description: `Response ${resp.hid} ${['accepted', 'denied'].includes(resp.status) ? 'has been' : 'is currently'} **${resp.status}**!`,
			color
		}]}
	},
	ephemeral: true
}