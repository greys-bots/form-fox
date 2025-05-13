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
				content: `-# select an option above`
			}
		)

		return comps;
	},

	setup: true,

	async handleMessage(message, response, question) {
		var index = parseInt(message.content);
		if(question.options.choices[index - 1]) {
			response.answers.push(question.options.choices[index - 1]);
			return {response, send: true};
		} else if(['other', 'o', '🅾'].includes(message.content.toLowerCase()) && question.options.other) {
			var msg = await message.channel.messages.fetch(response.message_id);
			var embed = msg.embeds[0];

			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
    		await msg.edit({embeds: [embed]});

    		await message.channel.send('Please enter a value below! (or type `cancel` to cancel)')
    		if(!response.selection) response.selection = [];
            response.selection.push('OTHER')
            return {response, menu: true};
		} else {
			await message.channel.send('Invalid choice! Please select something else');
			return undefined;
		}
	},

	async handleInteraction(msg, response, question, inter) {
		let val = inter.values;
		let choice = question.options.choices[parseInt(val[0])];
		if(choice) {
			response.answers.push(choice)
			var embed = msg.components[0].toJSON();
			var ind = embed.components.findIndex(x => x.type == 1);
			embed.components[ind] = {
				type: 10,
				content: `**Selected:**\n` + choice 
			}
			console.log(embed);
			return {
				response,
				send: true,
				embed
			};
		} else {
			await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
			if(!response.selection) response.selection = [];
            response.selection.push('OTHER')

            return {response, menu: true, send: false}
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

		if(!question.roles) question.roles = [];
		if(!question.roles.find(rl => rl.id == role.id)) question.roles.push({choice, id: role.id});

		return question;
	},

	async roleRemove({ctx, question, role}) {
		var choice = await ctx.client.utils.awaitSelection(ctx, question.options.choices.map((e, i) => {
			return {label: e.slice(0, 100), value: `${i}`}
		}), "What choice do you want to detach this from?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select choice'
		})
		if(typeof choice == 'string') return choice;

		c = parseInt(choice[0]);
		choice = question.options.choices[c];

		question.roles = question.roles.filter(rl => rl.choice !== choice || rl.id !== role.id);
		return question;
	},

	handleRoles(question, answers, index) {
		var roles = [];
		for(var r of question.roles) {
			if(answers[index].split('\n').includes(r.choice))
				roles.push(r.id);
		}

		return roles;
	},

	showRoles(q) {
		return q.choices.map((c) => {
			var roles = q.roles.filter(r => r.choice == c);
			return {
				type: 10,
				content:
					`### ${c}\n` +
					roles.length ? roles.map(r => `<@&${r.id}>`).join(" ") : "(none)"
			}
		})
	}
}