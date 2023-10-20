const {
	confBtns
} = require('../extras');

module.exports = {
	description: 'allows the user to choose one option from multiple choices',
	alias: ['multiple choice', 'multi', 'mc'],
	message: (current) => {
		var message = [
			...current.choices.map((c, i) => {
				return {name: `Option ${numbers[i + 1]}`, value: c}
			})
		];

		if(current.other) message.push({name: 'Other', value: 'Enter a custom response'});
		return message;
	},
	text: "interact or type the respective emoji/character to choose an option.",
	buttons: (current) => {
		var r = [{
			type: 2,
			style: 2,
			label: 'Select',
			custom_id: 'select',
			emoji: '✉️'
		}]
		if(current.other) r.push({
			type: 2,
			style: 2,
			label: 'Fill in',
			custom_id: 'other',
			emoji: '📝'
		})
		
		return r;
	},

	setup: true,

	async handleReactAdd(msg, response, question, react) {
		var index = numbers.indexOf(react.emoji.name);
		var embed = msg.embeds[0];
		if(question.choices[index - 1]) {
			response.answers.push(question.choices[index - 1]);
			return {response, send: true};
		} else if(react.emoji.name == "🅾" && question.other) {
			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
    		await msg.edit({embeds: [embed]});

    		await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
			if(!response.selection) response.selection = [];
            response.selection.push('OTHER')

            return {response, menu: true, send: false}
		} else {
			msg.channel.send('Invalid choice! Please select something else');
			return undefined;
		}
	},

	async handleMessage(message, response, question) {
		var index = parseInt(message.content);
		if(question.choices[index - 1]) {
			response.answers.push(question.choices[index - 1]);
			return {response, send: true};
		} else if(['other', 'o', '🅾'].includes(message.content.toLowerCase()) && question.other) {
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
		var embed = msg.embeds[0];
		switch(inter.customId) {
			case 'select':
				var ch = question.choices.map((c, i) => ({
					label: `Option ${i+1}`,
					value: i.toString(),
					emoji: numbers[i + 1],
					description: c.slice(0, 100)
				}))

				var choice = await inter.client.utils.awaitSelection(
					inter,
					ch,
					"Select an option below",
					{
						placeholder: 'Select option'
					}
				);
				if(!Array.isArray(choice)) return await inter.followUp(choice);

				response.answers.push(question.choices[parseInt(choice[0])])
				return {response, send: true};
				break;
			case 'other':
				embed.fields[embed.fields.length - 1].value = "Awaiting response...";
        		await inter.message.edit({embeds: [embed]});

        		await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
				if(!response.selection) response.selection = [];
                response.selection.push('OTHER')

                return {response, menu: true, send: false}
				break;
		}
	},

	async roleSetup({ctx, question, role}) {
		var choice = await ctx.client.utils.awaitSelection(ctx, question.choices.map((e, i) => {
			return {label: e.slice(0, 100), value: `${i}`}
		}), "What choice do you want to attach this to?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select choice'
		})
		if(typeof choice == 'string') return choice;

		var c = parseInt(choice[0]);
		choice = question.choices[c];

		if(!question.roles) question.roles = [];
		if(!question.roles.find(rl => rl.id == role.id)) question.roles.push({choice, id: role.id});

		return question;
	},

	async roleRemove({ctx, question, role}) {
		var choice = await ctx.client.utils.awaitSelection(ctx, question.choices.map((e, i) => {
			return {label: e.slice(0, 100), value: `${i}`}
		}), "What choice do you want to detach this from?", {
			min_values: 1, max_values: 1,
			placeholder: 'Select choice'
		})
		if(typeof choice == 'string') return choice;

		c = parseInt(choice[0]);
		choice = question.choices[c];

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
				name: c,
				value: roles.length ? roles.map(r => `<@&${r.id}>`).join(" ") : "(none)"
			}
		})
	}
}