module.exports = {
	data: {
		name: 'reposition',
		description: "Change a question's position",
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
				required: true
			},
			{
				name: 'position',
				description: "The new position for the question",
				type: 4,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [question] [position] - Change the position of a question"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
		if(form.questions.length == 1) return "Can't reposition when there's only one question on a form!";

		var p = ctx.options.getInteger('question');
		var q = form.questions[p - 1];
		if(!q) return "No question with that number!";

		var val = ctx.options.getInteger('position');
		if(val < 0) val = 1;
		if(val > form.questions.length + 1) val = form.questions.length + 1;
		form.questions.splice(p - 1, 1);
		form.questions.splice(val - 1, 0, q)

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {questions: form.questions});
		return 'Question updated!';
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