module.exports = {
	data: {
		name: 'apply',
		description: 'Apply to a form',
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: false,
			autocomplete: true
		}]
	},
	usage: [
		"[form_id] - Start a new form response"
	],
	async execute(ctx) {
		var id = ctx.options.getString('form_id')?.toLowerCase().trim();
		var form;
		if(!id) {
			form = await ctx.client.stores.forms.getByApplyChannel(ctx.guild.id, ctx.channel.id);
			if(!form.id) return "Please supply a form ID, or use this in a form's apply channel!";
		} else {
			form = await ctx.client.stores.forms.get(ctx.guildId, id);;
			if(!form.id) return 'Form not found!';
		}

		if(form.apply_channel && form.apply_channel != ctx.channel.id)
		return `This isn't the right channel for that form! Please apply in <#${form.apply_channel}>`;

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);

		var resp = await ctx.client.handlers.response.startResponse({
			user: ctx.user,
			form,
			cfg
		});
		
		if(resp) return resp;
		else return;
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
	permissions: [],
	guildOnly: true,
	ephemeral: true
}