const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'remove',
			description: 'Remove an action from a form',
			options: [
				{
					name: 'form',
					description: "ID of the form to remove an action from",
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'action',
					description: "The action to delete",
					type: 3,
					required: false
				}
			],
			usage: [
				"[form] - Remove all actions from a form",
				"[form] [action] - Remove a specific action from a form"
			]
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var fid = ctx.options.getString('form').toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guild.id, fid);
		if(!form) return 'Form not found!';

		var aid = ctx.options.getString('action')?.toLowerCase().trim();

		if(aid) {
			var action = await this.#stores.actions.get(ctx.guild.id, form.hid, aid);
			if(!action) return "Action not found!";

			var msg = await ctx.reply({
				content: (
					"Are you sure you want to delete this action on this form?\n" +
					"This can't be undone!"
				),
				fetchReply: true
			})
			var resp = await this.#bot.utils.getConfirmation(this.#bot, msg, ctx.user);
			if(resp.msg) return resp.msg;

			await action.delete();
			return "Action deleted!";
		} else {
			var msg = await ctx.reply({
				content: (
					"Are you sure you want to delete ALL actions on this form?\n" +
					"This can't be undone!"
				),
				fetchReply: true
			})
			var resp = await this.#bot.utils.getConfirmation(this.#bot, msg, ctx.user);
			if(resp.msg) return resp.msg;

			await this.#stores.actions.deleteByForm(ctx.guild.id, form.hid);
			return "Actions deleted!";
		}
	}

	async auto(ctx) {
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
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
	}
}

module.exports = (bot, stores) => new Command(bot, stores);