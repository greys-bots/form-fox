module.exports = {
	data: {
		name: 'rephrase',
		description: "Rewrite a question's wording",
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
				name: 'value',
				description: "The new wording for the question",
				type: 3,
				required: true
			}
		]
	},
	usage: [
		"[form_id] [question] [value] - Rephrase a question on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var p = ctx.options.getInteger('question');
		var q = form.questions[p - 1];
		if(!q) return "No question with that number!";

		var value = ctx.options.getString('value');
		if(value.length > 256) return "Question length too long! Must be 256 chars or less";
		form.questions[p - 1].value = value;

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