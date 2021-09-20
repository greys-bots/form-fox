const {confirmReacts:REACTS, qTypes:TYPES} = require(__dirname + '/../../extras');

module.exports = {
	help: () => 'View and manage questions for a form',
	usage: () => [
		" [form id] - View questions for a form",
		" add [form id] <question> - Add a new question to a form",
		" remove [form id] <question number> - Remove a question from a form",
		" set [form id] - Set new questions for a form",
		" rephrase [form id] <question number> <new question> - Rephrase or set a specific question",
		" reorder [form id] <question number> <new place> - Reorder a form's questions"
	],
	desc: ()=> [
		"Using this command will not invalidate any responses; however, ",
		"the questions will NOT be updated for existing ones. The changes will only affect ",
		"responses opened and finished after the fact!"
	].join(""),
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to work with!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var embeds = await bot.utils.genEmbeds(bot, form.questions, (data, i) => {
			return {
				name: `**${data.value}${data.required ? " (required)" : ""}**`,
				value: `**Type:** ${TYPES[data.type].alias[0]}\n\n` +
					   (data.choices ? `**Choices:**\n${data.choices.join("\n")}\n\n` : '') +
					   (data.other ? 'This question has an "other" option!' : '')
			}
		}, {
			title: form.name,
			description: form.description
		})

		return embeds;
	},
	alias: ['q'],
	permissions: ['MANAGE_MESSAGES'],
	subcommands: {}
}

module.exports.subcommands.add = {
	help: ()=> "Add a new question to a form",
	usage: ()=> [
		" [form id] - Runs a menu to add a new question to the given form",
		" [form id] <question> - Adds the question to the given form"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to work with!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';
		if(form.questions.length >= 20) return 'That form already has 20 questions!';

		var resp;
		var question = {value: args.slice(1).join(" "), type: 'text', required: false};
		var position = form.questions.length + 1;
		if(!question.value) {
			await msg.channel.send('What question would you like to add to the form?\nType `cancel` to cancel!');
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
			if(!resp) return 'ERR! Timed out!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			question.value = resp.content;
		}

		var message = await msg.channel.send(
			"What type of question would you like this to be?\n" +
			"Question types:\n" +
			"```\n" +
			Object.values(TYPES).map(t => `${t.alias.join(" | ")} - ${t.description}\n`).join("") +
			"```"
		)
		resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 2 * 60 * 1000})).first();
		if(!resp) return 'Timed out! Aborting!';
		var type = Object.keys(TYPES).find(t => TYPES[t].alias.includes(resp.content.toLowerCase()));
		if(!type) return "ERR! Invalid type!";
		question.type = type;
		await resp.delete();

		if(TYPES[type].setup) {
			var r = await TYPES[type].setup(bot, msg, message);
			if(typeof r == "string") return r;

			Object.assign(question, r)
		}

		message = await msg.channel.send(`Would you like this question to be required?`);
		REACTS.forEach(r => message.react(r));

		var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
		if(confirm.confirmed) question.required = true;
		
		await msg.channel.send([
			'What place do you want this question to be in?\n',
			'Remember that the question will bump down any others that were ',
			'in its place or after it!\n',
			'(Use `last` to put it at the end of the other questions!)'
		].join(""));
		resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
		if(!resp) return 'ERR! Timed out!';
		if(resp.content.toLowerCase() != 'last') position = parseInt(resp.content.toLowerCase());
		if(isNaN(position)) return 'ERR! Please provide a real number!';

		form.questions.splice(position - 1, 0, question);
		try {
			await bot.stores.forms.update(msg.channel.guild.id, form.hid, {questions: form.questions});
		} catch(e) {
			console.log(e)
			return 'ERR! '+e;
		}

		return 'Question added!';
	},
	alias: ['a', '+']
}

module.exports.subcommands.remove = {
	help: ()=> "Remove a question from a form",
	usage: ()=> [
		" [form id] <question number> - Removes the question from the given form"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to work with!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';
		if(form.questions.length <= 1)
			return "That form can't have any more questions removed!";

		var resp;
		var question = args.slice(1);
		if(!question) {
			await msg.channel.send('What question would you like to remove?\nType `cancel` to cancel!');
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
			if(!resp) return 'ERR! Timed out!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			question = resp.content;
		}

		question = parseInt(question);
		if(isNaN(question)) return 'ERR! Please provide a real number!';
		if(!form.questions[question - 1]) return "ERR! That question doesn't exist!"

		form.questions.splice(question - 1, 1);
		try {
			await bot.stores.forms.update(msg.channel.guild.id, form.hid, {questions: form.questions});
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Question removed!';
	},
	alias: ['r', 'rem', 'rmv', 'rv', '-']
}

module.exports.subcommands.set = {
	help: ()=> "Sets all questions on a form",
	usage: ()=> [
		" [form id] - Runs a menu to replace a form's questions"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to work with!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var data = {};
		data.questions = [];

		var fmessage = await msg.channel.send({embeds: [{
			title: form.name,
			description: form.description
		}]})
		var i = 0;
		var message;
		while(i < 20) {
			if(i == 0) message = await msg.channel.send(`Enter a question! Current question: ${i+1}/20\n(Type \`done\` to finish, or \`cancel\` to cancel!)`);
			else await message.edit(`Enter a question! Current question: ${i+1}/20\n(Type \`done\` to finish, or \`cancel\` to cancel!)`);
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 2 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			if(resp.content.toLowerCase() == 'done') break;
			data.questions.push({value: resp.content, type: 'text', required: false});
			await resp.delete();

			await message.edit(`Would you like this question to be required?`);
			REACTS.forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.confirmed) data.questions[i].required = true;
			
			if(confirm.message) await confirm.message.delete();
			await message.reactions.removeAll();

			await fmessage.edit({embeds: [{
				title: data.name,
				description: data.description,
				fields: data.questions.map((q, n) => { return {name: `Question ${n+1}${q.required ? ' (required)' : ''}`, value: q.value} }),
				color: parseInt('ee8833', 16)
			}]});

			i++;
		}

		try {
			await bot.stores.forms.update(msg.channel.guild.id, form.hid, data);
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Questions set!';
	},
	alias: ['s', 'replace']
}

module.exports.subcommands.rephrase = {
	help: ()=> "Rephrase an existing question on a form",
	usage: ()=> [
		" [form id] - Runs a menu to rephrase the question",
		" [form id] <question number> <new question> - Rephrases the given question"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to work with!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var resp;
		var position = args[1];
		var question = args.slice(2).join(" ");
		if(!question) {
			await msg.channel.send('What question number would you like to rephrase?\nType `cancel` to cancel!');
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
			if(!resp) return 'ERR! Timed out!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			position = resp.content;

			position = parseInt(position);
			if(isNaN(position)) return 'ERR! Please provide a real number!';
			if(!form.questions[position - 1]) return "ERR! That question doesn't exist!";
			question = 

			await msg.channel.send("Enter the new question!");
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
			if(!resp) return 'ERR! Timed out!';
			question = resp.content;
		}

		form.questions[position - 1].value = question;
		try {
			await bot.stores.forms.update(msg.channel.guild.id, form.hid, {questions: form.questions});
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Question updated!';
	},
	alias: ['change', 'update', 'upd8']
}

module.exports.subcommands.reorder = {
	help: ()=> "Reorders a question on a form",
	usage: ()=> [
		" [form id] - Runs a menu to reorder a question",
		" [form id] <question number> <new place> - Reorders a question on the given form"
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to work with!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var resp;
		var question = args[1];
		var position = args[2];
		if(!position) {
			await msg.channel.send('What question would you like reorder?\nType `cancel` to cancel!');
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
			if(!resp) return 'ERR! Timed out!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			question = resp.content;

			await msg.channel.send([
				'What place do you want this question to be in?\n',
				'Remember that the question will bump down any others that were ',
				'in its place or after it!\n',
				'(Use `last` to put it at the end of the other questions!)'
			]);
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, time: 2 * 60 * 1000, max: 1})).first();
			if(!resp) return 'ERR! Timed out!';
			if(resp.content.toLowerCase() != 'last') position = resp.content;
			else position = form.questions.length;
		}

		if(question == position) return 'ERR! Please choose a new position!';

		question = parseInt(question);
		position = parseInt(position);
		if(isNaN(question) || isNaN(position)) return 'ERR! Please provide a real number!';

		var tmp = form.questions[question - 1];
		form.questions.splice(question - 1, 1);
		form.questions.splice(position - 1, 0, tmp);
		try {
			await bot.stores.forms.update(msg.channel.guild.id, form.hid, {questions: form.questions});
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Question reordered!';
	},
	alias: ['ro', 'position', 'pos']
}