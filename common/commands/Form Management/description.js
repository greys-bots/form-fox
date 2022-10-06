const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'description',
			description: 'Set the description of a form',
			usage: [' [form id] [description] - Describe the given form'],
			alias: ['describe', 'desc'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true,
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[1]) return 'I need a form and a description!';

		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
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
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);