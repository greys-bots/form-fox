const tc = require('tinycolor2');

const { confBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'delete',
		description: "Deletes a form",
		options: [
			{
				name: 'form_id',
				description: 'The form\'s ID',
				type: 3,
				required: true,
				autocomplete: true
			}
		]
	},
	usage: [
		"[form_id] - Delete a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var rdata = {
			content: "Are you **sure** you want to delete this form?\n**WARNING:** All response data for this form will be lost! **This can't be undone!**",
			components: [
				{
					type: 1,
					components: confBtns
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
			await ctx.client.stores.forms.delete(ctx.guildId, form.hid);
			msg = 'Form deleted!';
		}

		if(conf.interaction) {
			await conf.interaction.update({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: confBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		} else {
			await ctx.editReply({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: confBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		}

		return;
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