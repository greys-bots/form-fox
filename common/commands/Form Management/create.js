module.exports = {
	help: () => 'Create a new form',
	usage: () => [' - Opens a menu to make a new form'],
	execute: async (bot, msg, args) => {
		var data = {};

		var form = await msg.channel.send({embed: {
			title: 'New Form',
			color: parseInt('ee8833', 16)
		}});

		var message = await msg.channel.send("What do you want to name the form?\n(Type `cancel` to cancel!)");
		var resp = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 60 * 1000})).first();
		if(!resp) return 'Timed out! Aborting!';
		if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
		data.name = resp.content;
		await resp.delete();
		await form.edit({embed: {
			title: resp.content,
			color: parseInt('ee8833', 16)
		}})

		await message.edit("What do you want the form's description to be?\n(Type `cancel` to cancel!)");
		resp = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 60 * 1000})).first();
		if(!resp) return 'Timed out! Aborting!';
		if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
		data.description = resp.content;
		await resp.delete();
		await form.edit({embed: {
			title: data.name,
			description: resp.content,
			color: parseInt('ee8833', 16)
		}})

		data.questions = [];
		var i = 0;
		while(i < 20) {
			await message.edit(`Enter a question! Current question: ${i+1}/20\n(Type \`done\` to finish, or \`cancel\` to cancel!)`);
			resp = (await msg.channel.awaitMessages(m => m.author.id == msg.author.id, {max: 1, time: 2 * 60 * 1000})).first();
			if(!resp) return 'Timed out! Aborting!';
			if(resp.content.toLowerCase() == 'cancel') return 'Action cancelled!';
			if(resp.content.toLowerCase() == 'done') break;
			data.questions.push({value: resp.content, type: 'text', required: false});
			await resp.delete();

			await message.edit(`Would you like this question to be required?`);
			['✅','❌'].forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.confirmed) data.questions[i].required = true;
			
			if(confirm.message) await confirm.message.delete();
			await message.reactions.removeAll();

			await form.edit({embed: {
				title: data.name,
				description: data.description,
				fields: data.questions.map((q, n) => { return {name: `Question ${n+1}${q.required ? ' (required)' : ''}`, value: q.value} }),
				color: parseInt('ee8833', 16)
			}});

			i++;
		}

		if(data.questions.length == 0) return 'No questions added! Aborting!';

		var code = bot.utils.genCode(bot.chars);
		try {
			await bot.stores.forms.create(msg.guild.id, code, data);
		} catch(e) {
			return 'ERR! '+e;
		}

		return [
			`Form created! ID: ${code}`,
			`Use \`${bot.prefix}channel ${code}\` to change what channel this form's responses go to!`,
			`Use \`${bot.prefix}roles ${code}\` to change what roles are added when this form is accepted!`,	
		].join('\n');
	},
	alias: ['new', 'add', 'n', '+'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}