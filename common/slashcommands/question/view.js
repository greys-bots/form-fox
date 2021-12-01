const { qTypes:TYPES } = require('../../extras');

module.exports = {
	data: {
		name: 'view',
		description: "View a form's questions",
		options: [{
			name: 'form_id',
			description: "The form's ID",
			type: 3,
			required: true,
			autocomplete: true
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
	ephemeral: true,
	guildOnly: true,
	permissions: ['MANAGE_GUILD']
}