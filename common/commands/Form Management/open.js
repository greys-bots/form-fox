const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'open',
			description: "Open a form for responses",
			usage: [' [form id] - Open the given form for more responses'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0]?.toLowerCase());
		if(!form.id) return "Form not found!";
		if(form.open) return "Form already open!";

		try {
			form.open = true;
			await form.save()
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form opened!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);