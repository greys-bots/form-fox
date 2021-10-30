module.exports = {
	data: {
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
				description: "The question number to rephrase",
				type: 4,
				required: false
			},
			{
				name: 'value',
				description: "Whether the question is required or not",
				type: 5,
				required: false
			}
		]
	},
	usage: [
		"[form_id] - View all required questions on a form",
		"[form_id] [question] [value] - Change if a question is required"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
		if(form.questions.length == 1) return "Can't delete the last question on a form!";

		var p = ctx.options.getInteger('question');
		var value = ctx.options.getString('value');
		if(p != null) {
			var q = form.questions[p - 1];
			if(!q) return "No question with that number!";

			form.questions[p - 1].required = value;

			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {questions: form.questions});
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
}