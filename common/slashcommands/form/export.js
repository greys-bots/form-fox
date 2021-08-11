module.exports = {
	data: {
		name: 'export',
		description: "Export forms",
		options: [{
			name: 'forms',
			description: "IDs of specific forms to export, separated by spaces",
			type: 3,
			required: false
		}]
	},
	async execute(ctx) {
		var ids = ctx.options.get('forms')?.value.toLowercase().trim().split(" ");

		var data = await ctx.client.stores.forms.export(ctx.guildId, ids);
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