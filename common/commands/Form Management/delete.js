const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> "Delete a form, and all its responses",
	usage: ()=> [
		' [form id] <form id> ... - Deletes given forms',
		' all | * - Delete all forms',
		' all | * -[form id] ... - Delete all except specific forms'
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to delete!';
		var message;
		var forms = (await bot.stores.forms.getAll(msg.guild.id) || []);
		if(!forms?.[0]) return 'No forms to delete!';

		args = args.join(" ").toLowerCase().split(" ");
		if(args.length == 1) {
			if(['all', '*'].includes(args[0])) {
				message = await msg.channel.send([
					'Are you sure you want to delete ALL your forms?\n',
					'WARNING: All response data will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;

				try {
					await bot.stores.forms.deleteAll(msg.guild.id);
				} catch(e) {
					return 'ERR! '+e;
				}

				return 'Forms deleted!';
			} else {
				var form = forms.find(f => f.hid == args[0]);
				if(!form) return 'Form not found!';
				
				message = await msg.channel.send([
					'Are you sure you want to delete this form?\n',
					'WARNING: All response data for this form will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;

				try {
					await bot.stores.forms.delete(msg.guild.id, form.hid);
				} catch(e) {
					return 'ERR! '+e;
				}

				return 'Form deleted!';
			}
		} else {
			if(['all', '*'].includes(args[0])) {
				var exceptions = args.slice(1).map(f => f.replace(/-\s?/g, ''));
				forms = forms.filter(f => !exceptions.includes(f.hid));
				if(!forms?.[0]) return 'No forms to delete!';

				message = await msg.channel.send([
					`Form IDs: ${forms.map(f => f.hid).join(', ')}\n`,
					'Are you sure you want to delete these forms?\n',
					'WARNING: All response data for these forms will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;

				try {
					await bot.stores.forms.deleteByHids(msg.guild.id, forms.map(f => f.hid));
				} catch(e) {
					return 'ERR! '+e;
				}

				return 'Forms deleted!';
			} else {
				message = await msg.channel.send([
					'Are you sure you want to delete these forms?\n',
					'WARNING: All response data for these forms will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;

				try {
					await bot.stores.forms.deleteByHids(msg.guild.id, forms.map(f => f.hid));
				} catch(e) {
					return 'ERR! '+e;
				}

				return 'Forms deleted!';
			}
		}
	},
	alias: ['del', 'remove'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}