const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'description',
		description: "Changes a form's description",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true
			},
			{
				name: 'description',
				description: 'The new description',
				type: 3,
				required: true
			}
		]
	},
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var d = ctx.options.get('description')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!d) {
			if(!form.description) return 'Form has no description set!';

			var rdata = {
				embeds: [
					{
						title: "Description",
						description: form.description,
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
				await ctx.client.stores.forms.update(ctx.guildId, form.hid, {cooldown: undefined});
				msg = 'Descriptiom reset!';
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

		if(d.length > 1000) return "Description length must be 1000 or less!"

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {description: d});
		return 'Form updated!';
	},
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}