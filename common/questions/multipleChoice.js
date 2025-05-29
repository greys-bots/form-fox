const {
	numbers
} = require('../extras');

module.exports = {
	description: 'allows the user to choose one option from multiple choices',
	alias: ['multiple choice', 'multi', 'mc'],

	embed(data) {
		let comps = [ ];
		let options = data.options.choices.map((c, i) => {
			return {
				label: c,
				value: `${i}`
			}
		})
		if(data.options.other) options.push({
			label: 'Other',
			description: 'Enter a custom response',
			value: 'OTHER'
		})

		comps.push(
			{
				type: 1,
				components: [{
					type: 3,
					custom_id: 'option-select',
					options,
					min_values: 1,
					max_values: 1
				}]
			},
			{
				type: 10,
				content: `Select an option above`
			}
		)

		return comps;
	},

	setup: true,

	async handle({ prompt, response, question, data }) {
		if(!Array.isArray(data)) data = [data];
		let choice = question.options.choices[parseInt(data[0])];
		if(choice) {
			response.answers.push(choice)
			var embed = prompt.components[0].toJSON();
			embed.components = embed.components.slice(0, embed.components.length - 2);
			embed.components.push({
				type: 10,
				content: `**Selected:**\n` + choice
			})
			console.log(embed);
			return {
				response,
				send: true,
				embed
			};
		} else if(['other', 'OTHER'].includes(data[0]) && question.options.other) {
			await prompt.channel.send('Please enter a value below! (or type `cancel` to cancel)')
			if(!response.selection) response.selection = [];
            response.selection.push('OTHER')

            return {response, menu: true, send: false}
		} else {
			await prompt.channel.send("Invalid choice! Please select something else")
			return;
		}
	},

	async roleSetup({ctx, question, role}) {
		var choice = await ctx.client.utils.awaitSelection(ctx, question.options.choices.map((e, i) => {
			return {label: e.slice(0, 100), value: `${i}`}
		}), "What choice do you want to attach this to?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select choice'
		})
		if(typeof choice == 'string') return choice;

		var c = parseInt(choice[0]);
		choice = question.options.choices[c];

		return { choice };
	}
}