const { clearBtns } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'clear',
			description: "Clear all roles attached to questions on a form",
			type: 1,
			options: [
				{
					name: 'form',
					description: "The form to change",
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'question',
					description: "The question number to clear roles from",
					type: 4,
					required: false
				}
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');

		var form = await this.#stores.forms.get(ctx.guild.id, f);
		if(!form) return 'Form not found!';

		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;

		var content;
		if(q) content = "Are you sure you want to clear ALL roles on this question?";
		else content = "Are you sure you want to clear ALL roles on these questions?"
		var rdata = {
			content,
			components: [
				{
					type: 1,
					components: clearBtns
				}
			]
		}
		var reply = await ctx.reply({...rdata, fetchReply: true});
		var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			if(q == null) {
				form.questions = form.questions.map(qu => {
					qu.roles = [];
					return qu;
				})
			} else {
				q = q - 1;
				form.questions[q].roles = [];
			}
			await form.save()
			msg = 'Roles cleared!';
		}

		return msg;
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