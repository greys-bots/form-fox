const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> "Clears responses",
	usage: ()=> [
		" - Deletes ALL responses across ALL forms",
		" [form id] - Deletes all responses for the given form"
	],
	execute: async ({bot, msg, args}) => {
		if(args[0]) {
			var form = await bot.stores.forms.get(msg.channel.guild.id, args[0]?.toLowerCase());
			if(!form.id) return 'Form not found!';

			var message = await msg.channel.send([
				"Are you sure you want to delete ",
				"ALL responses for this form? ",
				"You can't get them back!"
			].join(""));

			REACTS.forEach(r => message.react(r));

			var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.msg) return confirm.msg;

			try {
				await bot.stores.responses.deleteByForm(msg.channel.guild.id, form.hid);
				await bot.stores.forms.updateCount(msg.channel.guild.id, form.hid);
			} catch(e) {
				return 'ERR! '+e;
			}

			return 'Responses deleted!';
		}

		var message = await msg.channel.send([
			"Are you sure you want to delete ",
			"ALL responses for EVERY form? ",
			"You can't get them back!"
		].join(""));

		REACTS.forEach(r => message.react(r));

		var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
		if(confirm.msg) return confirm.msg;

		var forms = await bot.stores.forms.getAll(msg.channel.guild.id);
		for(var form of forms) {
			try {
				await bot.stores.responses.deleteByForm(msg.channel.guild.id, form.hid);
				await bot.stores.forms.updateCount(msg.channel.guild.id, form.hid);
			} catch(e) {
				return 'ERR! '+e;
			}
		}

		return 'Responses deleted!';
	},
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['DELETE_RESPONSES'],
	guildOnly: true
}