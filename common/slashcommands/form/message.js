const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'message',
		description: "Changes a form's acceptance message",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'message',
				description: 'The new acceptance message. Omit to view/clear current value',
				type: 3,
				required: false
			}
		]
	},
	usage: [
		"[form_id] - View and optionally clear a form's message",
		"[form_id] [message] - Set a form's message"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var m = ctx.options.get('message')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!m) {
			if(!form.message) return 'Form has no message set!';

			var rdata = {
				embeds: [
					{
						title: 'Message',
						description: form.message
					}
				],
				components: [
					{
						type: 1,
						components: clearBtns
					}
				]
			}
			await ctx.reply(rdata);

			var reply = await ctx.fetchReply();
			var conf = await ctx.client.utils.getConfirmation(ctx.client, reply, ctx.user);
			var msg;
			if(conf.msg) {
				msg = conf.msg;
			} else {
				await ctx.client.stores.forms.update(ctx.guildId, form.hid, {message: undefined});
				msg = 'Message reset!';
			}

			if(conf.interaction) {
				await conf.interaction.update({
					content: msg,
					embeds: [],
					components: [{
						type: 1,
						components: clearBtns.map(b => {
							b.disabled = true;
							return b;
						})
					}]
				})
			} else {
				await ctx.editReply({
					content: msg,
					embeds: [],
					components: [{
						type: 1,
						components: clearBtns.map(b => {
							b.disabled = true;
							return b;
						})
					}]
				})
			}
			return;
		}

		if(m.length > 1000) return "Message length must be 1000 or less!"

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {message: m});
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