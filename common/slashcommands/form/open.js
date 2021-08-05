module.exports = {
	name: 'open',
	description: 'Opens a form, turning on responses',
	options: [
		{
			name: 'form_id',
			description: 'The form\'s ID',
			type: 3,
			required: true
		}	
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);
		if(!form) return 'Form not found!';

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {open: true});
		return 'Form updated!';
	},
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}