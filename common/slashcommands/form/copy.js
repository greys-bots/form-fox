const OPTIONS = require(__dirname + '/../../extras').options;

module.exports = {
	name: 'copy',
	description: 'Copy a form and its data',
	options: [
		{
			name: 'form_id',
			description: 'The ID of the form to copy',
			type: 3,
			required: true
		}
	],
	async execute(ctx) {
		var farg = ctx.options.get('form_id')?.value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, farg);
		if(!form) return 'Form not found!';

		var tocopy = await ctx.client.utils.awaitSelection(ctx, OPTIONS.map(o => {
				return {
					label: o.val,
					value: o.val,
					description: o.desc
				}
			}), "What would you like to copy?", {
			min_values: 1, max_values: OPTIONS.length,
			placeholder: 'Select what to copy'
		})
		if(typeof tocopy == 'string') return events;

		var code = ctx.client.utils.genCode(ctx.client.chars);
		var data = {};
		tocopy.forEach(v => data[v] = form[v]);

		try {
			await ctx.client.stores.forms.create(ctx.guildId, code, data);
		} catch(e) {
			return 'ERR! '+e;
		}

		await ctx.editReply({
			content: `Form copied! ID: ${code}\n` +
					 `Use \`/channel ${code}\` to change what channel this form's responses go to!\n` +
					 `See \`/help\` for more customization commands`,
			components: [{
				type: 1,
				components: components.map(c => {c.disabled = true; return c})
			}]
		});
		return;
	}
}