const { qTypes: TYPES, confBtns } = require('../../extras');

module.exports = {
	name: 'add',
	description: "Add a question to a form",
	type: 1,
	options: [
		{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true
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
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var q = ctx.options.getString('question').trim();
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
			var rep = await ctx.reply({content: "Please enter up to 10 choices for this question", fetchReply: true});
			var m = await rep.channel.awaitMessages({
				filter: (ms) => ms.author.id == ctx.user.id,
				max: 1,
				time: 300000
			});
			m = m?.first();
			if(!m) return "No choices given!";
			question.choices = m.content.split("\n").slice(0, 10);
			await m.delete()

			rep = await ctx.editReply({
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
			var c = await ctx.client.utils.getConfirmation(ctx.client, rep, ctx.user);
			if(c.confirmed) question.other = true;
			if(c.interaction) {
				await c.interaction.update({
					components: [{
						type: 1,
						components: [
							{
								type: 2,
								style: 3,
								label: 'Yes',
								custom_id: 'yes',
								emoji: { name: '✅'},
								disabled: true
							},
							{
								type: 2,
								style: 4,
								label: 'No',
								custom_id: 'no',
								emoji: { name: '❌'},
								disabled: true
							},
						]
					}]
				})
			} else {
				await ctx.editReply({
					components: [{
						type: 1,
						components: [
							{
								type: 2,
								style: 3,
								label: 'Yes',
								custom_id: 'yes',
								emoji: { name: '✅'},
								disabled: true
							},
							{
								type: 2,
								style: 4,
								label: 'No',
								custom_id: 'no',
								emoji: { name: '❌'},
								disabled: true
							},
						]
					}]
				})
			}
		}

		form.questions.splice(pos - 1, 0, question);
		await ctx.client.stores.forms.update(ctx.guildId, form.hid, {questions: form.questions});

		return "Question added!";
	}
}