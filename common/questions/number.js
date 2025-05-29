const {
	NACTIONS
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
				label: "Enter the value below (this should be a number)",
				min_length: 1,
				max_length: 1024,
				required: true,
				placeholder: "18"
			}]
		}]
	}
}

module.exports = {
	description: 'requires the user to enter only numbers',
	text: "valid number required.",
	alias: ['number', 'numbers', 'num'],

	embed(data) {
		return [{
			type: 10,
			content: '-# Requires an integer/number'
		}];
	},

	async handle({ prompt, response, data }) {
		if(isNaN(parseInt(data))) {
			await prompt.channel.send("Invalid response! Please provide a number value");
			return undefined;
		}
		var embed = prompt.components[0].toJSON();
		embed.components[embed.components.length - 1] = {
			type: 10,
			content: data
		}

		response.answers.push(data);
		return {response, send: true, embed};
	},

	async roleSetup({ctx, question, role}) {
		var compare = await ctx.client.utils.awaitSelection(ctx, NACTIONS,
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

		var resp = await this.bot.utils.getChoice(ctx.client, msg, ctx.user, 2 * 60 * 1000, false);
		if(!resp.choice) return 'Err! Nothing selected!';

		var value;
		var mod = await this.bot.utils.awaitModal(resp.interaction, MODALS.compVal, user, true, 5 * 60_000);
        if(mod) value = mod.fields.getTextInputValue('value')?.trim().parseInt();
		if(isNaN(value)) return "Valid number needed!";

		return {compare, value};
	}
}