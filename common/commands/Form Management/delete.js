module.exports = {
	help: ()=> "Delete a form, and all its responses",
	usage: ()=> [' [form id] - Delete a form'],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to delete!';

		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var message = await msg.channel.send([
			'Are you sure you want to delete this form?\n',
			'WARNING: All response data will be lost! This cannot be undone!'
		].join(''));
		['✅','❌'].forEach(r => message.react(r));

		var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
		if(confirm.msg) return confirm.msg;

		try {
			await bot.stores.forms.delete(msg.guild.id, form.hid);
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Form deleted!';
	},
	alias: ['del', 'remove'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}