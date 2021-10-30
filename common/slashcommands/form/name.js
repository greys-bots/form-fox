const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'name',
		description: "Changes a form's name",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'name',
				description: 'The new name',
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [name] - Set a form's name"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var n = ctx.options.get('name')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!n) return "Name required!";

		if(n.length > 100) return "Name length must be 100 or less!"

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {name: n});
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