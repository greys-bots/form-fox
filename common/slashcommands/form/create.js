module.exports = {
	data: {
		name: 'create',
		description: "Create a new form",
		options: [
			{
				name: 'name',
				description: "The form's name",
				type: 3,
				required: true
			},
			{
				name: 'description',
				description: "The form's description",
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[name] [description] - Creates a new form with the given name and description"
	],
	async execute(ctx) {
		var name = ctx.options.getString('name').trim();
		var description = ctx.options.getString('description').trim();

		var code = ctx.client.utils.genCode(ctx.client.chars);
		await ctx.client.stores.forms.create(ctx.guildId, code, {
			name,
			description,
			questions: []
		});

		return (
			`Form created! ID: ${code}` +
			"\nUse `/question add` to start adding questions to this form" +
			"\nUse `/config channel` to set the response channel for this form" +
			"\nUse `/help form` for some customization options!"
		)
	}
}