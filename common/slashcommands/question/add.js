const { qTypes: TYPES } = require('../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'add',
			description: "Add a question to a form",
			type: 1,
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
					description: "The question to add",
					type: 3,
					required: true
				},
				{
					name: 'type',
					description: "The type of the question",
					type: 3,
					required: true,
					choices: Object.keys(TYPES).map(t => {
						return {
							name: TYPES[t].alias[0],
							value: t
						}
					})
				},
				{
					name: 'required',
					description: "If the question is required",
					type: 5,
					required: true
				},
				{
					name: 'position',
					description: "Where to put the question. Leave empty for last",
					type: 4,
					required: false
				}
			],
			usage: [
				"[form_id] [question] [type] [required] - Add a new question to a form",
				"[form_id] [question] [type] [required] [position] - Add a new question to a form and set its position"
			],
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';

		var q = ctx.options.getString('question').trim();
		if(q.length > 256) return "Question length too long! Must be 256 chars or less";
		
		var type = ctx.options.getString('type');
		var required = ctx.options.getBoolean('required');
		var pos = ctx.options.getInteger('position', false);

		if(pos == null || isNaN(pos) || pos > form.questions.length)
			pos = form.questions.length + 1;
		if(pos <= 0) pos = 1;
		var question = {
			value: q,
			required,
			type
		}

		if(TYPES[type].setup) {
			var mdata = {
				title: "Add new question",
				custom_id: `question-add-${form.hid}`,
				components: [
					{
						type: 1,
						components: [
							{
								type: 4,
								custom_id: 'answers',
								label: "Answers",
								style: 2,
								max_length: 2000,
								placeholder: (
									"Enter your choices, each on a separate line. Maximum of 10. Example:\n" +
									"Answer 1\n" +
									"Answer 2\n" +
									"Answer 2\n"
								),
								required: true
							}
						]
					}
				]
			}
			var m = await this.#bot.utils.awaitModal(ctx, mdata, ctx.user, false, 300000)
			if(!m) return "No choices given!";
			question.choices = m.fields.getField('answers').value.trim().split("\n").slice(0, 10);

			var rep = await m.followUp({
				content: "Do you want to include an `other` option?",
				components: [{
					type: 1,
					components: [
						{
							type: 2,
							style: 3,
							label: 'Yes',
							custom_id: 'yes',
							emoji: { name: '✅'}
						},
						{
							type: 2,
							style: 4,
							label: 'No',
							custom_id: 'no',
							emoji: { name: '❌'}
						},
					]
				}],
				fetchReply: true
			});
			var c = await this.#bot.utils.getConfirmation(this.#bot, rep, ctx.user);
			if(c.confirmed) question.other = true;
		}

		form.questions.splice(pos - 1, 0, question);
		await form.save()

		return "Question added!";
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