const tc = require('tinycolor2');

module.exports = {
	name: 'close',
	description: 'Closes a form, turning off responses',
	options: [
		{
			name: 'form_id',
			description: 'The form\'s ID',
			type: 3,
			required: true
		},
		{
			name: 'color',
			description: 'The color you want. Omit to view/clear current color',
			type: 3,
			required: false
		}
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase();
		var c = ctx.options.get('color')?.value;
		var form = ctx.client.stores.forms.get(ctx.guildId, id);
		if(!form) return 'Form not found!';

		if(!color) {
			if(!form.color) return 'Form has no color set!';

			await ctx.reply({
				content: `Current color: **#${form.color}.** Would you like to clear it?`,
				ephemeral: true,
				
			})
		}
		
		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {open: false});
		return 'Form updated!';
	},
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}