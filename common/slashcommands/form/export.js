module.exports = {
	data: {
		name: 'export',
		description: "Export forms",
		options: [
			{
				name: 'forms',
				description: "IDs of specific forms to export, separated by spaces",
				type: 3,
				required: false
			},
			{
				name: 'responses',
				description: "Whether responses should be exported",
				type: 5,
				required: false 
			}
		]
	},
	usage: [
		"- Export all forms",
		"[forms] - Export specific forms"
	],
	async execute(ctx) {
		var ids = ctx.options.getString('forms')?.toLowerCase().trim().split(" ");
		var resp = ctx.options.getBoolean('responses');

		var data = await ctx.client.stores.forms.export(ctx.guildId, ids, resp);
		if(!data?.[0]) return "No forms to export!";

		return {
			content: "Here's your file!",
			files: [{
				attachment: Buffer.from(JSON.stringify(data)),
				name: "forms.json"
			}]
		}
	}
}