module.exports = {
	data: {
		name: 'ticketmsg',
		description: 'Set a message to send in created ticket channels',
		options: [
			{
				name: 'message',
				description: 'The message to set',
				type: 3,
				required: true
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
		"[message] - Set the default ticket message for all forms",
		"[channel] [form_id] - Set the ticket message for a form"
	],
	extra: 
		"Variables available:\n" +
		"$USER - ping the user who opened the response\n" +
		"$GUILD - the guild's name\n" +
		"$FORM - the form's name\n" +
		"$FORMID - the form's ID\n" +
		"Example message: `Hello $USER! This ticket " +
		"has been opened to discuss your response to " +
		"form $FORMID ($FORM)`",
	async execute(ctx) {
		var farg = ctx.options.getString('form_id')?.toLowerCase().trim();
		var tmsg = ctx.options.getString('message');

		if(farg) {
			var form = await ctx.client.stores.forms.get(ctx.guildId, farg);
			if(!form) return 'Form not found!';

			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {ticket_msg: tmsg});
			return "Form updated!";
		}

		var cfg = await ctx.client.stores.configs.get(ctx.guildId);
		if(!cfg) await ctx.client.stores.configs.create(ctx.guildId, {ticket_message: tmsg});
		else await ctx.client.stores.configs.update(ctx.guildId, {ticket_message: tmsg});
		
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