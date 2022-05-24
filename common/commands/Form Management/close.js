module.exports = {
	help: ()=> "Close a form for responses",
	usage: ()=> [' [form id] - Close the given form for more responses'],
	execute: async (bot, msg, args) => {
		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0]?.toLowerCase());
		if(!form.id) return "Form not found!";
		if(!form.open) return "Form already closed!";

		try {
			form.open = false;
			 await form.save()
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form closed!';
	},
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_FORMS'],
	guildOnly: true
}