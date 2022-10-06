const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'message',
			description: 'Set the acceptance message of a form',
			usage: [' [form id] [message] - Set the message to be sent to the user after their form is accepted'],
			extra: [
				'This command comes with variables you can use!',
				'**$USER** - Mentions the user!',
				'**$GUILD** - Names the guild!',
				"Example acceptance message: `You've been accepted! Welcome to $GUILD, $USER!`"
			].join('\n'),
			alias: ['msg'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[1]) return 'I need a form and a message!';

		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
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
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);