module.exports = {
	data: {
		name: 'ticketcategory',
		description: 'Set a ticket category',
		options: [
			{
				name: 'category',
				description: 'The category to set',
				type: 7,
				required: true,
				channel_types: [4]
			},
			{
				name: 'form_id',
				description: "ID of a form to change",
				type: 3,
				required: false,
				autocomplete: true
			}
		]
	},
	usage: [
		"[category] - Set the default ticket category for all forms",
	"[category] [form_id] - Set the ticket category for a form"
	],
	async execute(ctx) {
		var farg = ctx.options.getString('form_id')?.toLowerCase().trim();
		var chan = ctx.options.getChannel('category');

		if(farg) {
			var form = await ctx.client.stores.forms.get(ctx.guildId, farg);
			if(!form) return 'Form not found!';

			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {tickets_id: chan.id});
			return "Form updated!";
		}

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);
		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {ticket_category: chan.id});
		else await ctx.client.stores.configs.update(ctx.guildId, {ticket_category: chan.id});
		
		return "Config updated!";
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
	guildOnly: true
}