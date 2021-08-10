const { clearBtns } = require('../../extras');

module.exports = {
	name: 'cooldown',
	description: "Changes a form's cooldown",
	options: [
		{
			name: 'form_id',
			description: 'The form\'s ID',
			type: 3,
			required: true
		},
		{
			name: 'cooldown',
			description: 'The number of days for the cooldown. Omit to view/clear current value',
			type: 4,
			required: false
		}
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var c = ctx.options.get('cooldown')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!c) {
			if(!form.cooldown) return 'Form has no cooldown set!';

			var rdata = {
				embeds: [
					{
						description: `Current cooldown: **${form.cooldown} days**`,
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
				msg = 'Cooldown reset!';
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
		
		var cd = parseInt(c);
		if(cd < 0) return 'Cooldown must be positive!';

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {cooldown: cd});
		return 'Form updated!';
	},
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}