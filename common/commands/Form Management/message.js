module.exports = {
	help: ()=> 'Set the acceptance message of a form',
	usage: ()=> [' [form id] [message] - Set the message to be sent to the user after their form is accepted'],
	desc: ()=> [
		'This command comes with variables you can use!',
		'**$USER** - Mentions the user!',
		'**$GUILD** - Names the guild!',
		"Example acceptance message: `You've been accepted! Welcome to $GUILD, $USER!`"
	].join('\n'),
	execute: async ({bot, msg, args}) => {
		if(!args[1]) return 'I need a form and a message!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';

		try {
			form.message = args.slice(1).join(' ');
			await form.save()
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form message set!';
	},
	alias: ['msg'],
	permissions: ['MANAGE_MESSAGES'],
	opPerms: ['MANAGE_FORMS'],
	guildOnly: true
}