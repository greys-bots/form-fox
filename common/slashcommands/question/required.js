const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'required',
			description: "Manage required questions",
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
					description: "The number of the question to change",
					type: 4,
					required: false
				},
				{
					name: 'value',
					description: "Whether the question is required or not",
					type: 5,
					required: false
				}
			],
			usage: [
				"[form_id] - View all required questions on a form",
				"[form_id] [question] [value] - Change if a question is required"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		var p = ctx.options.getInteger('question');
		var value = ctx.options.getBoolean('value');
		if(p != null) {
			var q = form.questions[p - 1];
			if(!q) return "No question with that number!";

			form.questions[p - 1].required = value;

			await form.save()
			return 'Question updated!';
		}

		var e = {
			title: 'Required questions',
			fields: []
		};
		for(var i = 0; i < form.questions.length; i++) {
			if(!form.questions[i].required) continue;
			e.fields.push({
				name: `Question ${i + 1}`,
				value: form.questions[i].value
			})
		}

		return {
			embeds: [e],
			ephemeral: true
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