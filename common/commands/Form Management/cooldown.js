module.exports = {
	help: ()=> 'Set the cooldown rate of a form',
	usage: ()=> [' [form id] [days] - Sets the cooldown for the given form'],
	desc: ()=>
		'The cooldown determines how long a user has to wait ' +
		'before applying to the form again if their app is denied!\n' +
		'Set this to 0 for no cooldown rate',
	execute: async (bot, msg, args) => {
		if(!args[1]) return 'I need a form and a cooldown!';

		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';
		if(isNaN(parseInt(args[1]))) return 'I need a real number!';

		try {
			await bot.stores.forms.update(msg.guild.id, form.hid, {cooldown: parseInt(args[1])});
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form cooldown set!';
	},
	alias: ['cd'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}