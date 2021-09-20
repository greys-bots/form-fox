const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'emoji',
		description: "Changes a form's emoji",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true
			},
			{
				name: 'emoji',
				description: 'The emoji to use for binding reacts. Omit to view/clear current value',
				type: 3,
				required: false
			}
		]
	},
	usage: [
		"[form_id] - View and optionally reset a form's emoji",
		"[form_id] [emoji] - Set a form's emoji"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var e = ctx.options.get('emoji')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!e) {
			if(!form.emoji) return 'Form uses the default emoji! 📝';

			var v = form.emoji.includes(':') ? `<:${form.emoji}:>` : form.emoji;
			var rdata = {
				embeds: [
					{
						description: `Current emoji: **${v}**`,
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
				await ctx.client.stores.forms.update(ctx.guildId, form.hid, {emoji: undefined});
				msg = 'Emoji reset!';
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
		
		var emoji = e.includes(':') ? e.replace(/<:(.*):>/, '$1') : e;

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {emoji});
		return 'Form updated!';
	},
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}