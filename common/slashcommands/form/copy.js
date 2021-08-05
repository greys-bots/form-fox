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
		//, {
		// 	name: 'copy_items',
		// 	description: 'The form data to copy',
		// 	type: 3,
		// 	required: true,
		// 	choices: OPTIONS.map(o => {
		// 		return {name: o.val, value: o.val};
		// 	})
		// }
	],
	async execute(ctx) {
		var farg = ctx.options.get('form_id')?.value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, farg);
		if(!form) return 'Form not found!';

		var components = [{
			type: 3,
			custom_id: 'copy_selector',
			options: OPTIONS.map(o => {
				return {
					label: o.val,
					value: o.val,
					description: o.dec
				}
			}),
			placeholder: 'Select what to copy',
			min_values: 1,
			max_values: OPTIONS.length
		}]
		await ctx.reply({
			content: "What would you like to copy?",
			components: [{
				type: 1,
				components
			}]
		});

		var reply = await ctx.fetchReply();
		var resp = await reply.awaitMessageComponent({
			filter: (intr) => intr.user.id == ctx.user.id && intr.customId == 'copy_selector',
			time: 60000
		});
		if(!resp) return 'Nothing selected to copy!';
		await resp.update('Working...');

		var code = ctx.client.utils.genCode(ctx.client.chars);
		var data = {};
		resp.values.forEach(v => data[v] = form[v]);

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