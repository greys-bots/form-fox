const {qTypes:TYPES, confirmReacts:REACTS} = require(__dirname + '/../../extras');

module.exports = {
	help: () => 'Create a new form',
	usage: () => [' - Opens a menu to make a new form'],
	desc: () => [
		"Question types:",
		"```",
		Object.values(TYPES).map(t => `${t.alias.join(" | ")} - ${t.description}`).join("\n"),
		"```"
	].join("\n"),
	execute: async (bot, msg, args) => {
		var data = {};
		var message, confirm;

		var form = await msg.channel.send({embeds: [{
			title: 'New Form',
			color: parseInt('ee8833', 16)
		}]});

		message = await msg.channel.send("What do you want to name the form?\n(Type `cancel` to cancel!)");
		var resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 60 * 1000})).first();
		if(!resp) return 'Timed out! Aborting!';
		if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
		data.name = resp.content;
		await resp.delete();
		await form.edit({embeds: [{
			title: resp.content,
			color: parseInt('ee8833', 16)
		}]})

		await message.edit("What do you want the form's description to be?\n(Type `cancel` to cancel!)");
		resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 60 * 1000})).first();
		if(!resp) return 'Timed out! Aborting!';
		if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
		data.description = resp.content;
		await resp.delete();
		await form.edit({embeds: [{
			title: data.name,
			description: resp.content,
			color: parseInt('ee8833', 16)
		}]})

		data.questions = [];
		var i = 0;
		while(i < 20) {
			await message.edit(`Enter a question! Current question: ${i+1}/20\n(Type \`done\` to finish, or \`cancel\` to cancel!)`);
			resp = (await msg.channel.awaitMessages({filter: m => m.author.id == msg.author.id, max: 1, time: 2 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			if(resp.content.toLowerCase() == 'done') break;
			if(resp.content.length > 256) return "Question too long! Must be 256 chars or less. Aborting!";
			data.questions.push({value: resp.content, type: 'text', required: false});
			await resp.delete();

			await message.edit(
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
			data.questions[i].type = type;
			await resp.delete();

			if(TYPES[type].setup) {
				var r = await TYPES[type].setup(bot, msg, message);
				if(typeof r == "string") return r;

				Object.assign(data.questions[i], r)
			}

			await message.edit(`Would you like this question to be required?`);
			REACTS.forEach(r => message.react(r));

			confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.confirmed) data.questions[i].required = true;
			
			if(confirm.message) await confirm.message.delete();
			await message.reactions.removeAll();

			await form.edit({embeds: [{
				title: data.name,
				description: data.description,
				fields: data.questions.map((q, n) => { return {name: `Question ${n+1}${q.required ? ' (required)' : ''}`, value: q.value} }),
				color: parseInt('ee8833', 16)
			}]});


			i++;
		}

		if(data.questions.length == 0) return 'No questions added! Aborting!';

		var code = bot.utils.genCode(bot.chars);
		try {
			var fm = await bot.stores.forms.create(msg.channel.guild.id, data);
		} catch(e) {
			return 'ERR! '+e;
		}

		return [
			`Form created! ID: ${fm.hid}`,
			`Use \`${bot.prefix}channel ${fm.hid}\` to change what channel this form's responses go to!`,
			`Use \`${bot.prefix}post ${fm.hid}\` with a channel to post your form!`,
			`See \`${bot.prefix}h\` for more customization commands`	
		].join('\n');
	},
	alias: ['new', 'add', 'n', '+'],
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_FORMS'],
	guildOnly: true
}
