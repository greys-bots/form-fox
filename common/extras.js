const TACTIONS = [
	{
		label: 'answer contains...',
		value: 'contains'
	},
	{
		label: 'answer is equal to...',
		value: 'equals'
	}
]

const NACTIONS = [
	{
		label: 'answer is less than...',
		value: 'lt'
	},
	{
		label: 'answer is greater than...',
		value: 'gt'
	},
	{
		label: 'answer is less than or equal to...',
		value: 'lte'
	},
	{
		label: 'answer is greater than or equal to...',
		value: 'gte'
	},
	{
		label: 'answer is equal to...',
		value: 'eq'
	}
]

const qTypes = {
	'mc': {
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
		setup: async (bot, msg, message) => {
			await message.edit(`Please enter up to 10 options to choose from, separated by new lines.`);
			var resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 5 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			var choices = resp.content.split("\n")/*.filter(x => x)*/;
			await resp.delete()

			await message.edit("Would you like to include an 'other' option?");
			confirmReacts.forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.confirmed) var other = true;

			if(confirm.message) await confirm.message.delete();
			await message.reactions.removeAll();

			return {choices, other};
		},
		handleReactAdd: async (msg, response, question, react) => {
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
		handleMessage: async (message, response, question) => {
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
		handleInteraction: async (msg, response, question, inter) => {
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
	},
	'cb': {
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
		setup: async (bot, msg, message) => {
			await message.edit(`Please enter up to 10 options to choose from, separated by new lines.`);
			var resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 5 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			var choices = resp.content.split("\n").filter(x => x);
			await resp.delete()

			await message.edit("Would you like to include an 'other' option?");
			confirmReacts.forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.confirmed) var other = true;

			if(confirm.message) await confirm.message.delete();
			await message.reactions.removeAll();

			return {choices, other};
		},
		handleReactAdd: async (msg, response, question, react) => {
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
		handleReactRemove: async (msg, response, question, react) => {
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
		handleMessage: async (message, response, question) => {
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
		handleInteraction: async (msg, response, question, inter) => {
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
					name: c,
					value: roles.length ? roles.map(r => `<@&${r.id}>`).join(" ") : "(none)"
				}
			})
		}
	},
	'text': {
		description: 'allows the user to freely type an answer',
		alias: ['text', 'free'],
		handleMessage: async (message, response) => {
			response.answers.push(message.content);
			if(message.attachments.size > 0)
				response.answers[response.answers.length - 1] += "\n\n**Attachments:**\n" + message.attachments.map(a => a.url).join("\n");
			return {response, send: true};
		},
		async roleSetup({ctx, question, role}) {
			if(question.roles?.find(rl => rl.id == role.id))
				return "Role already attached to question!";
				
			var action = await ctx.client.utils.awaitSelection(ctx, TACTIONS.map((e) => {
				return e;
			}), "How do you want to compare the answer?", {
				min_values: 1, max_values: 1,
				placeholder: 'Select comparison'
			})
			if(typeof choice == 'string') return choice;

			await ctx.followUp("Enter the value you want to compare the answer to");
			var val = await ctx.client.utils.awaitMessage(ctx.client, ctx, ctx.user, 60000);
			if(typeof val == 'string') return val;
			val = val.content;

			if(!question.roles) question.roles = [];
			question.roles.push({
				id: role.id,
				action: action[0],
				value: val
			})

			return question;
		},
		async roleRemove({question, role}) {
			question.roles = question.roles.filter(r => r.id !== role.id);
			return question;
		},
		handleRoles(question, answers, index) {
			var roles = [];
			for(var r of question.roles) {
				switch(r.action) {
					case 'contains':
						if(answers[index].toLowerCase().includes(r.value.toLowerCase()))
							roles.push(r.id);
						break;
					case 'equals':
						if(answers[index].toLowerCase() == r.value.toLowerCase())
							roles.push(r.id);
						break;
				}
			}

			return roles;
		},
		showRoles(q) {
			return q.roles.map(r => {
				return {
					name: `${r.action} | ${r.value.slice(0, 50)}`,
					value: `<@&${r.id}>`
				}
			})
		}
	},
	'num': {
		description: 'requires the user to enter only numbers',
		text: "valid number required.",
		alias: ['number', 'numbers', 'num'],
		handleMessage: async (message, response) => {
			if(isNaN(parseInt(message.content))) {
				await message.channel.send("Invalid response! Please provide a number value");
				return undefined;
			}

			response.answers.push(message.content);
			return {response, send: true};
		},
		async roleSetup({ctx, question, role}) {
			if(question.roles?.find(rl => rl.id == role.id))
				return "Role already attached to question!";
				
			var action = await ctx.client.utils.awaitSelection(ctx, NACTIONS.map((e) => {
				return e;
			}), "How do you want to compare the answer?", {
				min_values: 1, max_values: 1,
				placeholder: 'Select comparison'
			})
			if(typeof choice == 'string') return choice;

			await ctx.followUp("Enter the value you want to compare the answer to");
			var val = await ctx.client.utils.awaitMessage(ctx.client, ctx, ctx.user, 60000);
			if(typeof val == 'string') return val;
			val = parseInt(val.content);
			if(isNaN(val)) return "Valid number needed!";

			if(!question.roles) question.roles = [];
			question.roles.push({
				id: role.id,
				action: action[0],
				value: val
			})

			return question;
		},
		async roleRemove({question, role}) {
			question.roles = question.roles.filter(r => r.id !== role.id);
			return question;
		},
		handleRoles(question, answers, index) {
			var roles = [];
			var int = parseInt(answers[index]);
			if(isNaN(int)) return roles;
			
			for(var r of question.roles) {
				switch(r.action) {
					case 'lt':
						if(int < r.value)
							roles.push(r.id);
						break;
					case 'lte':
						if(int <= r.value)
							roles.push(r.id);
						break;
					case 'gt':
						if(int > r.value)
							roles.push(r.id);
						break;
					case 'gte':
						if(int >= r.value)
							roles.push(r.id);
						break;
					case 'eq':
						if(int == r.value)
							roles.push(r.id);
						break;
				}
			}

			return roles;
		},
		showRoles(q) {
			return q.roles.map(r => {
				return {
					name: `${r.action} | ${r.value}`,
					value: `<@&${r.id}>`
				}
			})
		}
	},
	'dt': {
		description: 'requires the user to enter only a date',
		text: "valid date required.",
		alias: ['date', 'dt'],
		handleMessage: async (message, response) => {
			var date = new Date(message.content);
			if(isNaN(date)) {
				await message.channel.send("Invalid response! Please send a valid date");
				return undefined;
			}

			response.answers.push(`<t:${Math.floor(date.getTime() / 1000)}:D>`);
			return {response, send: true};
		}
	},
	'img': {
		description: 'requires the user to send an image',
		text: "image attachment required.",
		alias: ['image', 'img'],
		handleMessage: async (message, response) => {
			if(message.attachments.size == 0) {
				await message.channel.send('Invalid response! Please attach an image');
				return undefined;
			}
			if(!message.attachments.find(a => a.height && a.width)) {
				await message.channel.send('Invalid response! Please attach a valid image');
				return undefined;
			}
			response.answers.push(message.content);
			response.answers[response.answers.length - 1] += "\n\n**Attachments:**\n" + message.attachments.map(a => a.url).join("\n");
			return {response, send: true};
		}
	},
	'att': {
		description: 'requires the user to send an attachment of any type',
		text: "attachment required.",
		alias: ['attachment', 'attach', 'att'],
		handleMessage: async (message, response) => {
			if(message.attachments.size == 0) {
				await message.channel.send('Invalid response! Please add an attachment');
				return undefined;
			}
			response.answers.push(message.content);
			response.answers[response.answers.length - 1] += "\n\n**Attachments:**\n" + message.attachments.map(a => a.url).join("\n");
			return {response, send: true};
		}
	},
	// {type: 'fm', description: 'requires the user to enter text following a specific format', alias: ['format', 'formatted', 'fm', 'custom']}
}

const options = [
	{val: 'name', desc: 'copy name for this form', alias: ['n', 'name']},
	{val: 'description', desc: 'copy description for this form', alias: ['d', 'desc', 'description']},
	{val: 'roles', desc: 'copy roles for this form', alias: ['r', 'rls', 'rs', 'roles']},
	{val: 'channel_id', desc: 'copy response channel for this form', alias: ['ch', 'chan', 'channel']},
	{val: 'message', desc: 'copy acceptance message for this form', alias: ['m', 'msg', 'message']},
	{val: 'color', desc: 'copy color for this form', alias: ['c', 'col', 'colour', 'color']}
]

const numbers = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
const confirmReacts = ['✅','❌'];

const qButtons = {
	nTemp: {
		type: 2,
		style: 2,
	},
	other: {
		type: 2,
		style: 2,
		label: 'Other',
		custom_id: 'other',
		emoji: '🅾️'
	},
	select: {
		type: 2,
		style: 1,
		label: 'Select',
		custom_id: 'select',
		emoji: '✏️'
	},
	skip: {
		type: 2,
		style: 2,
		label: 'Skip',
		custom_id: 'skip',
		emoji: '➡️'
	},
	submit: {
		type: 2,
		style: 3,
		label: 'Submit',
		custom_id: 'submit',
		emoji: { name: '✅'}
	},
	cancel: {
		type: 2,
		style: 4,
		label: 'Cancel',
		custom_id: 'cancel',
		emoji: { name: '❌'}
	}
}

const submitBtns = [
	{
		type: 2,
		style: 3,
		label: 'Submit',
		custom_id: 'submit',
		emoji: { name: '✅'}
	},
	{
		type: 2,
		style: 4,
		label: 'Cancel',
		custom_id: 'cancel',
		emoji: { name: '❌'}
	}
]

module.exports = {
	qTypes,
	TACTIONS,
	NACTIONS,
	options,
	numbers,
	confirmReacts,
	confirmVals: [['y', 'yes', '✅'], ['n', 'no', '❌']],
	confirmBtns: [['yes', 'clear'], ['no', 'cancel']],
	events: ['apply', 'submit', 'accept', 'deny'],

	qButtons,
	submitBtns,
	clearBtns: [
		{
			type: 2,
			style: 4,
			label: 'Clear',
			custom_id: 'clear',
			emoji: { name: '🗑'}
		},
		{
			type: 2,
			style: 1,
			label: 'Cancel',
			custom_id: 'cancel',
			emoji: { name: '❌'}
		}
	],
	confBtns: [
		{
			type: 2,
			style: 3,
			label: 'Confirm',
			custom_id: 'yes',
			emoji: { name: '✅'}
		},
		{
			type: 2,
			style: 4,
			label: 'Cancel',
			custom_id: 'no',
			emoji: { name: '❌'}
		}
	],
	responseBtns: [
		{
			type: 2,
			style: 3,
			label: 'Accept',
			custom_id: 'accept',
			emoji: '✅'
		},
		{
			type: 2,
			style: 4,
			label: 'Deny',
			custom_id: 'deny',
			emoji: '❌'
		},
		{
			type: 2,
			style: 2,
			label: 'Ticket',
			custom_id: 'ticket',
			emoji: '🎟️'
		}
	],
	pageBtns: (ind, len) => {
		return [
			{
				type: 2,
				emoji: '⏮️',
				style: 1,
				custom_id: 'first'
			},
			{
				type: 2,
				emoji: '◀️',
				style: 1,
				custom_id: 'prev'
			},
			{
				type: 2,
				label: `page ${ind}/${len}`,
				style: 2,
				custom_id: 'page',
				disabled: true
			},
			{
				type: 2,
				emoji: '▶️',
				style: 1,
				custom_id: 'next'
			},
			{
				type: 2,
				emoji: '⏭️',
				style: 1,
				custom_id: 'last'
			}
		]
	},
	denyBtns: (disabled) => ([{
		type: 1,
		components: [
			{
				type: 2,
				label: 'Add reason',
				custom_id: 'reason',
				style: 1,
				emoji: '📝',
				disabled
			},
			{
				type: 2,
				label: 'Skip reason',
				custom_id: 'skip',
				style: 2,
				emoji: '➡️',
				disabled
			},
			{
				type: 2,
				label: 'Cancel',
				custom_id: 'cancel',
				style: 4,
				emoji: '❌',
				disabled
			},
		]
	}]),

	requiredPerms: [
		'AddReactions',
		'ManageMessages',
		'EmbedLinks',
		'AttachFiles',
		'ReadMessageHistory',
		'ViewChannel',
		'SendMessages'
	],
	opPerms: {
		"MANAGE_RESPONSES": "Allow users to accept and deny responses",
		"DELETE_RESPONSES": "Allow users to clear and delete responses",
		"MANAGE_FORMS": "Allow users to create and edit forms",
		"DELETE_FORMS": "Allow users to delete forms",
		"MANAGE_CONFIG": "Allow users to set config options",
		"MANAGE_OPS": "Allow users to add and remove opped users/roles",
	}
}
