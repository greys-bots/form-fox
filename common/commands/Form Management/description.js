module.exports = {
	help: ()=> 'Set the description of a form',
	usage: ()=> [' [form id] [description] - Describe the given form'],
	execute: async (bot, msg, args) => {
		if(!args[1]) return 'I need a form and a description!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';

		try {
			form.description = args.slice(1).join(' ');
			await form.save();
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form description set!';
	},
	alias: ['describe', 'desc'],
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_FORMS'],
	guildOnly: true
}