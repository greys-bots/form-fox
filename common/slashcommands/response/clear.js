const { clearBtns } = require('../../extras');

module.exports = {
	data: {
		name: 'clear',
		description: "Clear all responses on a form",
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: false,
			autocomplete: true
		}]
	},
	usage: [
		"- Delete all responses across all forms",
		"[form_id] - Delete all responses for a single form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id')?.value.toLowerCase().trim();

		var msg;
		var conf;
		var rp;
		var rdata;
		if(id) {
			var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
			if(!form.id) return 'Form not found!';

			rdata = {
				content: "Are you sure you want to delete ALL responses for this form? This can't be undone!",
				components: [
					{
						type: 1,
						components: clearBtns
					}
				]
			}
			rp = await ctx.reply({...rdata, fetchReply: true});
			conf = await ctx.client.utils.getConfirmation(ctx.client, rp, ctx.user);
			if(conf.msg) {
				msg = conf.msg;
			} else {
				await ctx.client.stores.responses.deleteByForm(ctx.guildId, form.hid);
				msg = 'Responses cleared!';
			}

		} else {
			rdata = {
				content: "Are you sure you want to delete ALL responses for ALL forms? This can't be undone!",
				components: [
					{
						type: 1,
						components: clearBtns
					}
				]
			}
			rp = await ctx.reply({...rdata, fetchReply: true});
			conf = await ctx.client.utils.getConfirmation(ctx.client, rp, ctx.user);
			if(conf.msg) {
				msg = conf.msg;
			} else {
				await ctx.client.stores.responses.deleteAll(ctx.guildId);
				msg = 'Responses cleared!';
			}
		}

		if(conf.interaction) {
			await conf.interaction.update({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: clearBtns.map(b => {
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
					components: clearBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		}
		return
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
}