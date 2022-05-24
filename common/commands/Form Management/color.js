module.exports = {
	help: ()=> 'Set the color for a form',
	usage: ()=> [' [form id] [color] - Sets the given form\'s color'],
	execute: async (bot, msg, args) => {
		if(!args[1]) return 'I need a form and a color!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';

		var color = bot.tc(args.slice(1).join(''));
		if(!color.isValid()) return 'That color is invalid!';

		try {
			form.color = color.toHex();
			await form.save()
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form color set!';
	},
	alias: ['col', 'colour'],
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_FORMS'],
	guildOnly: true
}