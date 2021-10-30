const { confBtns } = require('../../extras');

module.exports = {
	data: {
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
		]
	},
	usage: [
		"[form_id] [question] - Delete a question on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';
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

		var conf = await ctx.client.utils.getConfirmation(ctx.client, reply, ctx.user);
		var msg;
		if(conf.msg) {
			msg = conf.msg;
		} else {
			form.questions.splice(p - 1, 1);
			await ctx.client.stores.forms.update(ctx.guildId, form.hid, {questions: form.questions});
			msg = 'Question deleted!';
		}

		if(conf.interaction) {
			await conf.interaction.update({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: confBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		} else {
			await ctx.editReply({
				content: msg,
				embeds: [],
				components: [{
					type: 1,
					components: confBtns.map(b => {
						return {... b, disabled: true};
					})
				}]
			})
		}

		return;
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