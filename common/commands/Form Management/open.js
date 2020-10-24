module.exports = {
	help: ()=> "Open a form for responses",
	usage: ()=> [' [form id] - Open the given form for more responses'],
	execute: async (bot, msg, args) => {
		var form = await bot.stores.forms.get(msg.guild.id, args[0]?.toLowerCase());
		if(!form) return "Form not found!";
		if(form.open) return "Form already open!";

		try {
			await bot.stores.forms.update(msg.guild.id, form.hid, {open: true});
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form opened!';
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}