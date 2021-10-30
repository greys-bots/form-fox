module.exports = {
	data: {
		name: 'open',
		description: 'Opens a form, turning on responses',
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true,
				autocomplete: true
			}	
		]
	},
	usage: [
		"[form_id] - Open the given form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);
		if(!form) return 'Form not found!';

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {open: true});
		return 'Form updated!';
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
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}