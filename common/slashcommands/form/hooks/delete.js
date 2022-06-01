module.exports = {
	data: {
		name: 'delete',
		description: "Delete an existing hook",
		type: 1,
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'hook_id',
				description: "The hook's ID",
				type: 3,
				required: true
			},
		]
	},
	usage: [
		"[form_id] [hook_id] - Delete a hook on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';
		
		var hid = ctx.options.get('hook_id').value.toLowerCase().trim();
		var hook = await ctx.client.stores.hooks.get(ctx.guildId, form.hid, hid);
		if(!hook) return "Hook not found!";

		await hook.delete();
		return 'Hook deleted!'
	},
	async auto(ctx) {
		var forms = await ctx.client.stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

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
}