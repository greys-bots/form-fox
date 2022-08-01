const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'remove',
			description: "Detach roles from questions on a form",
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
					description: "The question number to change",
					type: 4,
					required: true
				},
				{
					name: 'role',
					description: "The role to detach from the question",
					type: 8,
					required: true
				}
			],
			usage: [
				"[form] [question] [role] - Open a menu to see the available choices and detach a role from one",
				"[form] [question] [role] [choice] - Skip the menu and detach a role from a specific chocie"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');
		var c = ctx.options.getInteger('choice');
		var r = ctx.options.getRole('role');

		var form = await this.#stores.forms.get(ctx.guild.id, f);
		if(!form) return 'Form not found!';

		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;
		var question = form.questions[q - 1];
		if(!TYPES[question.type].roleSetup)
			return "Invalid question! You can only attach roles to certain question types";
		if(!question.roles?.length) return "Nothing attached to that question!";

		question = await TYPES[question.type].roleRemove({
			ctx,
			question,
			role: r
		})
		if(typeof question == 'string') return question;
		form.questions[q - 1] = question;

		await form.save()
		return "Question updated!";
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