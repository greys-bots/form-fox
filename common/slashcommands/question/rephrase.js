module.exports = {
	data: {
		name: 'rephrase',
		description: "Rewrite a question's wording",
		options: [
			{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true
			},
			{
				name: 'question',
				description: "The question number to rephrase",
				type: 4,
				required: true
			},
			{
				name: 'value',
				description: "The new wording for the question",
				type: 3,
				required: true
			}
		]
	},
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
		if(form.questions.length == 1) return "Can't delete the last question on a form!";

		var p = ctx.options.getInteger('question');
		var q = form.questions[p - 1];
		if(!q) return "No question with that number!";

		var value = ctx.options.getString('value');
		form.questions[p - 1].value = value;

		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {questions: form.questions});
		return 'Question updated!';
	}
}