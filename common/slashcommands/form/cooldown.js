const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'cooldown',
		description: "Changes a form's cooldown",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'cooldown',
				description: 'The number of days for the cooldown. Omit to view/clear current value',
				type: 4,
				required: false
			}
		]
	},
	usage: [
		"[form_id] - View and optionally clear a form's cooldown",
		"[form_id] [cooldown] - Set a form's cooldown"
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