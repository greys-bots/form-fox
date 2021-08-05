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

			if(current.other) message.push({name: 'Other', value: 'Enter a custom response (react with 🅾️ or type "other")'});
			return message;
		},
		text: "react or type the respective emoji/character to choose an option.",
		reacts: (current) => {
			var r = [...numbers.slice(1, current.choices.length + 1)];
			if(current.other) r.push('🅾');
			return r;
		},
		setup: async (bot, msg, message) => {
			await message.edit(`Please enter up to 10 options to choose from, separated by new lines.`);
			var resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 5 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			var choices = resp.content.split("\n");
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
    		} else if(react.emoji.name == "🅾️" && question.other) {
    			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
        		await msg.edit({embed});

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
        		await msg.edit({embed});

        		await message.channel.send('Please enter a value below! (or type `cancel` to cancel)')
        		if(!response.selection) response.selection = [];
                response.selection.push('OTHER')
                return {response, menu: true};
			} else {
    			message.channel.send('Invalid choice! Please select something else');
    			return undefined;
    		}
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
		setup: async (bot, msg, message) => {
			await message.edit(`Please enter up to 10 options to choose from, separated by new lines.`);
			var resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 5 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			var choices = resp.content.split("\n");
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
        		await msg.edit({embed});
        		if(!response.selection) response.selection = [];
        		response.selection.push(question.choices[index - 1]);
        		return {response, send: false};
    		} else if(react.emoji.name == "🅾" && question.other) {
    			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
        		await msg.edit({embed});

        		await msg.channel.send('Please enter a value below! (or type `cancel` to cancel)')
				if(!response.selection) response.selection = [];
                response.selection.push('OTHER')
                return {response, send: false, menu: true};
    		} else if(react.emoji.name == '✏️') {
    			response.answers.push(response.selection.join("\n"));
    			return {response, send: true};
    		} else {
    			msg.channel.send('Invalid choice! Please select something else');
    			return undefined;
    		}
		},
		handleReactRemove: async (msg, response, question, react) => {
			var index = numbers.indexOf(react.emoji.name);
    		if(question.choices[index - 1]) {
    			var embed = msg.embeds[0];
    			embed.fields[index].value = question.choices[index - 1];
    			await msg.edit({embed});
    			if(response.selection) response.selection = response.selection.filter(x => x !== question.choices[index - 1]);
    			return {response};
    		} else if(react.emoji.name == "🅾️") {
    			response.selection = response.selection.filter(x => question.choices.includes(x));

    			var embed = msg.embeds[0];
    			embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
    			await msg.edit({embed});

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

				await msg.edit({embed});
				return {response};
    		} else if(['other', 'o'].includes(message.content.toLowerCase()) && question.other) {
    			if(response.selection?.find(x => !question.choices.includes(x))) {
    				response.selection = response.selection.filter(x => question.choices.includes(x));
    				embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
    				await msg.edit({embed});
    			}
    			embed.fields[embed.fields.length - 1].value = "Awaiting response...";
        		await msg.edit({embed});

        		await message.channel.send('Please enter a value below! (or type `cancel` to cancel)')
        		if(!response.selection) response.selection = [];
                response.selection.push('OTHER')
                
				return {response, menu: true}
    		} else if(message.content.toLowerCase() == "select") {
    			response.answers.push(response.selection.join("\n"));
    			return {response, send: true};
    		} else {
    			msg.channel.send('Invalid choice! Please select something else');
    			return undefined;
    		}
		}
	},
	'text': {
		description: 'allows the user to freely type an answer',
		alias: ['text', 'free'],
		handleMessage: async (message, response, question) => {
			response.answers.push(message.content);
			if(message.attachments.size > 0)
				response.answers[response.answers.length - 1] += "\n\n**Attachments:**\n" + message.attachments.map(a => a.url).join("\n");
			return {response, send: true};
		}
	},
	'num': {
		description: 'requires the user to enter only numbers',
		text: "valid number required.",
		alias: ['number', 'numbers', 'num'],
		handleMessage: async (message, response, question) => {
			if(isNaN(parseInt(message.content)))
				return message.channel.send("Invalid response! Please provide a number value");

			response.answers.push(message.content);
			return {response, send: true};
		}
	},
	'dt': {
		description: 'requires the user to enter only a date',
		text: "valid date required.",
		alias: ['date', 'dt'],
		handleMessage: async (message, response, question) => {
			var date = new Date(message.content);
			if(isNaN(date))
				return message.channel.send("Invalid response! Please send a valid date");

			response.answers.push(date);
			return {response, send: true};
		}
	},
	'img': {
		description: 'requires the user to send an image',
		text: "image attachment required.",
		alias: ['image', 'img'],
		handleMessage: async (message, response, question) => {
			if(message.attachments.size == 0) {
				message.channel.send('Invalid response! Please attach an image');
				return undefined;
			}
			if(!message.attachments.find(a => a.height && a.width)) {
				message.channel.send('Invalid response! Please attach a valid image');
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
		handleMessage: async (message, response, question) => {
			if(message.attachments.size == 0) {
				message.channel.send('Invalid response! Please add an attachment');
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

module.exports = {
	qTypes,
	options,
	numbers,
	confirmReacts,
	confirmVals: [['y', 'yes', '✅'], ['n', 'no', '❌']],
	confirmBtns: [['yes', 'clear'], ['no', 'cancel']],
	events: ['submit', 'accept', 'deny'],

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
	]
}
