const tc = require('tinycolor2');

const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'color',
		description: "Changes a form's color",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'color',
				description: 'The color you want. Omit to view/clear current color',
				type: 3,
				required: false
			}
		]
	},
	usage: [
		"[form_id] - View and optionally clear a form's color",
		"[form_id] [color] - Set a form's color"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var c = ctx.options.get('color')?.value;
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		if(!c) {
			if(!form.color) return 'Form has no color set!';

			var rdata = {
				embeds: [
					{
						description: `Current color: **#${form.color}.**`,
						color: parseInt(form.color, 16)
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
				await ctx.client.stores.forms.update(ctx.guildId, form.hid, {color: undefined});
				msg = 'Color reset!';
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
		
		var color = tc(c);
		if(!color.isValid()) return 'That color isn\'t valid!';

		color = color.toHex();
		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {color});
		return 'Form updated!';
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
	perms: ['MANAGE_MESSAGES'],
	guildOnly: true
}