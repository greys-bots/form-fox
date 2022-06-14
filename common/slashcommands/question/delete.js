const { confBtns } = require('../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'delete',
			description: "Delete a question from a form",
			options: [
				{
					name: 'form_id',
					description: "The form's ID",
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'question',
					description: "The question number to delete",
					type: 4,
					required: true
				}
			],
			usage: [
				"[form_id] [question] - Delete a question on a form"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';
		if(form.questions.length == 1) return "Can't delete the last question on a form!";

		var p = ctx.options.getInteger('question');
		var q = form.questions[p - 1];
		if(!q) return "No question with that number!";

		var reply = await ctx.reply({
			content: 'Are you sure you want to delete this question?',
			embeds: [{
				title: "Question " + p,
				description: q.value,
				fields: [
					{name: "Type", value: q.type},
					{name: "Required", value: `${q.required ?? "false"}`},
					{name: "Choices", value: q.choices ? q.choices.join("\n") : "(none)"}
				]
			}],
			components: [{type: 1, components: confBtns}],
			fetchReply: true
		});

		var conf = await this.#bot.utils.getConfirmation(this.#bot, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			form.questions.splice(p - 1, 1);
			await form.save()
			msg = 'Question deleted!';
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