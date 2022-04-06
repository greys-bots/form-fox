const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> 'Set emoji a form',
	usage: ()=> [
		' [form id] - Views and optionally clears an existing emote',
		' [form id] [new emoji] - Sets emoji for the given form'
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need at least a form!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var val;
		if(!args[1]) {
			if(!form.emoji) return 'No emoji set!';
			var message = await msg.channel.send(
				`Current emoji: ${form.emoji}\n` +
				'Would you like to reset it?'
			);
			REACTS.forEach(r => message.react(r));

			var conf = await bot.utils.getConfirmation(bot, message, msg.author);
			if(conf.msg) return conf.msg;

			val = null;
		} else {
			val = args[1].includes(':') ?
				  args[1].replace(/<:(.*)>/,'$1') :
				  args[1];
			if(form.emoji == val) return 'Form already using that emoji!';
		}

		try {
			await bot.stores.forms.update(msg.channel.guild.id, form.hid, {emoji: val}, form);
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Emoji updated!';
	},
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_FORMS'],
	guildOnly: true
}