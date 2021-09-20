const { qTypes:TYPES } = require('../../extras');

module.exports = {
	data: {
		name: 'view',
		description: "View a form's questions",
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true
		}]
	},
	usage: [
		"[form_id] - View all questions on a form"
	],
	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await ctx.client.stores.forms.get(ctx.guildId, id);;
		if(!form) return 'Form not found!';

		var embeds = await ctx.client.utils.genEmbeds(ctx.client, form.questions, (data, i) => {
			return {
				name: `**${data.value}${data.required ? " (required)" : ""}**`,
				value: `**Type:** ${TYPES[data.type].alias[0]}\n\n` +
					(data.choices ? `**Choices:**\n${data.choices.join("\n")}\n\n` : '') +
					(data.other ? 'This question has an "other" option!' : '')
			}
		},
		{
			title: form.name,
			description: form.description
		})

		return embeds.map(e => e.embed);
	},
	ephemeral: true,
	guildOnly: true,
	permissions: ['MANAGE_GUILD']
}