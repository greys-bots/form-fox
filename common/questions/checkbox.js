const {
	numbers
} = require('../extras');

module.exports = {
	description: 'allows the user to choose several options from multiple choices',
	text: 'react or type the respective emoji/character to choose an option. react with ✏️ or type "select" to confirm selected choices.',
	alias: ['checkbox', 'check', 'cb'],
	message: (current) => {
		var message = [
			...current.choices.map((c, i) => {
				return {name: `Option ${numbers[i + 1]}`, value: c}
			})
		];

		if(current.other) message.push({name: 'Other', value: 'Enter a custom response (react with 🅾️ or type "other")'});
		return message;
	},
	reacts: (current) => {
		var r = [...numbers.slice(1, current.choices.length + 1)];
		if(current.other) r.push('🅾');
		return [
			...r,
			'✏️'
		];
	},
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

		r.push({
			type: 2,
			style: 2,
			label: 'Finish selection',
			custom_id: 'finish',
			emoji: '📥'
		})
		return r;
	},
	setup: true,

	async handleReactAdd(msg, response, question, react) {
		var index = numbers.indexOf(react.emoji.name);
		var embed = msg.embeds[0];
		if(question.choices[index - 1]) {
			if(response.selection?.includes(question.choices[index - 1]))
				return undefined;
				
			embed.fields[index].value = question.choices[index - 1] + " ✅";
    		await msg.edit({embeds: [embed]});
    		if(!response.selection) response.selection = [];
    		response.selection.push(question.choices[index - 1]);
    		return {response, send: false};
		} else if(react.emoji.name == "🅾" && question.other) {
			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
    		await msg.edit({embeds: [embed]});

    		await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
			if(!response.selection) response.selection = [];
            response.selection.push('OTHER')
            return {response, send: false, menu: true};
		} else if(react.emoji.name == '✏️') {
			if(!response.selection?.length) {
				await msg.channel.send("Please select something!");
				return {response, send: false};
			}
			response.answers.push(response.selection.join("\n"));
			response.selection = [];
			return {response, send: true};
		} else {
			await msg.channel.send('Invalid choice! Please select something else');
			return undefined;
		}
	},

	async handleReactRemove(msg, response, question, react) {
		var index = numbers.indexOf(react.emoji.name);
		if(question.choices[index - 1]) {
			var embed = msg.embeds[0];
			embed.fields[index].value = question.choices[index - 1];
			await msg.edit({embeds: [embed]});
			if(response.selection) response.selection = response.selection.filter(x => x !== question.choices[index - 1]);
			return {response};
		} else if(react.emoji.name == "🅾️") {
			response.selection = response.selection.filter(x => question.choices.includes(x));

			var embed = msg.embeds[0];
			embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
			await msg.edit({embeds: [embed]});

			return {response};
		} else return undefined;
	},

	async handleMessage(message, response, question) {
		var index = parseInt(message.content);
		var msg = await message.channel.messages.fetch(response.message_id);
		var embed = msg.embeds[0];
			
		if(question.choices[index - 1]) {
			if(response.selection?.includes(question.choices[index - 1])) {
				embed.fields[index].value = question.choices[index - 1];
				response.selection = response.selection.filter(x => x != question.choices[index - 1]);
			} else {
				embed.fields[index].value = question.choices[index - 1] + " ✅";
				if(!response.selection) response.selection = [];
    			response.selection.push(question.choices[index - 1]);
			}

			await msg.edit({embeds: [embed]});
			return {response};
		} else if(['other', 'o'].includes(message.content.toLowerCase()) && question.other) {
			if(response.selection?.find(x => !question.choices.includes(x))) {
				response.selection = response.selection.filter(x => question.choices.includes(x));
				embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
				await msg.edit({embeds: [embed]});
			}
			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
    		await msg.edit({embeds: [embed]});

    		await message.channel.send('Please enter a value below! (or type `cancel` to cancel)')
    		if(!response.selection) response.selection = [];
            response.selection.push('OTHER')
            
			return {response, menu: true}
		} else if(message.content.toLowerCase() == "select") {
			if(!response.selection?.length) {
				await msg.channel.send("Please select something!");
				return {response, send: false};
			}
			response.answers.push(response.selection.join("\n"));
   			response.selection = [];
			return {response, send: true};
		} else {
			await msg.channel.send('Invalid choice! Please select something else');
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
					description: c.slice(0, 100),
					default: response.selection?.includes(c)
				}))

				var choice = await inter.client.utils.awaitSelection(
					inter,
					ch,
					"Select an option below",
					{
						placeholder: 'Select option',
						max_values: question.choices.length
					}
				);
				if(!Array.isArray(choice)) return await inter.followUp(choice);

				var tmp = question.choices.filter((x, i) => choice.includes(i.toString()));
				var other = response.selection?.find(x => !question.choices.includes(x));
				if(other) tmp.push(other)
				response.selection = tmp;
				var fs = question.choices.map((c, i) => ({
					name: `Option ${numbers[i+1]} ${response.selection.includes(c) ? '✅' : ''}`,
					value: c
				}))
				if(question.other) fs.push(embed.fields[embed.fields.length - 1]);
				
				embed.fields = [embed.fields[0], ...fs];
				await inter.message.edit({embeds: [embed]})
				return {response, send: false};
				break;
			case 'other':
				embed.fields[embed.fields.length - 1].value = "Awaiting response...";
        		await inter.message.edit({embeds: [embed]});

        		await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
				if(!response.selection) response.selection = [];
                response.selection.push('OTHER')

                return {response, menu: true, send: false}
				break;
			case 'finish':
				if(!response.selection?.length) {
    				await inter.followUp("Please select something!");
    				return {response, send: false};
    			}
    			response.answers.push(response.selection.join("\n"));
    			response.selection = [];
    			return {response, send: true};
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
		if(!question.roles.find(rl => rl.id == role.id))
			question.roles.push({choice, id: role.id});

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
				type: 10,
				content:
					`### ${c}\n` +
					roles.length ? roles.map(r => `<@&${r.id}>`).join(" ") : "(none)"
			}
		})
	}
}