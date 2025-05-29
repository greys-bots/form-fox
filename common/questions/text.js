const {
	TACTIONS
} = require('../extras');

const MODALS = {
	compVal: {
		title: "Comparison value",
		custom_id: 'comp-value',
		components: [{
			type: 1,
			components: [{
				type: 4,
				custom_id: ' value',
				style: 2,
				label: "Enter the value below",
				min_length: 1,
				max_length: 1024,
				required: true,
				placeholder: "adult or minor or another text value"
			}]
		}]
	}
}

module.exports = {
	description: 'allows the user to freely type an answer',
	alias: ['text', 'free'],

	embed(data) {
		return [{
			type: 10,
			content: '-# Requires a text response'
		}];
	},

	async handle({ prompt, response, data }) {
		var answer = data.content;
		if(data.attachments.size > 0)
			answer += "\n\n**Attachments:**\n" + data.attachments.map(a => a.url).join("\n");

		var embed = prompt.components[0].toJSON();
		embed.components[embed.components.length - 1] = {
			type: 10,
			content: answer
		}

		response.answers.push(answer);
		return {response, send: true, embed};
	},

	async roleSetup({ctx, question, role}) {
		var compare = await ctx.client.utils.awaitSelection(ctx, TACTIONS,
			"How do you want to compare the answer?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select comparison'
		})
		if(typeof compare == 'string') return compare;
		compare = compare[0]

		var msg = await ctx.followUp({
			content: "Click the button below to enter the value you want to compare the answer to",
			components: [{
				type: 1,
				components: [{
					type: 2,
					style: 1,
					custom_id: 'enter',
					label: 'Enter value'
				}]
			}],
			fetchReply: true
		});

		var resp = await ctx.client.utils.getChoice(ctx.client, msg, ctx.user, 2 * 60 * 1000, false);
		if(!resp.choice) return 'Err! Nothing selected!';

		var value;
		var mod = await ctx.client.utils.awaitModal(resp.interaction, MODALS.compVal, user, true, 5 * 60_000);
        if(mod) value = mod.fields.getTextInputValue('value')?.trim();

		return {compare, value};
	}
}