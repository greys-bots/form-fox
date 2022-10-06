const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'cooldown',
			description: 'Set the cooldown rate of a form',
			usage: [' [form id] [days] - Sets the cooldown for the given form'],
			extra:
				'The cooldown determines how long a user has to wait ' +
				'before applying to the form again if their app is denied!\n' +
				'Set this to 0 for no cooldown rate',
			alias: ['cd'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true,
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[1]) return 'I need a form and a cooldown!';

		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';
		var num = parseInt(args[1]);
		if(isNaN(num)) return 'I need a real number!';
		if(num < 0) num = 0;

		try {
			form.cooldown = num;
			await form.save()
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form cooldown set!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);