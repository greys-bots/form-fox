module.exports = {
	data: {
		name: 'apply',
		description: 'Apply to a form',
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true
		}]
	},
	usage: [
		"[form_id] - Start a new form response"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);

		var resp = await ctx.client.handlers.response.startResponse({
			user: ctx.user,
			form,
			cfg
		});
		
		if(resp) return resp;
		else return;
	},
	permissions: [],
	guildOnly: true,
	ephemeral: true
}