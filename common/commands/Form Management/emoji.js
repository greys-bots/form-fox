const REACTS = require(__dirname + '/../../extras').confirmReacts;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'emoji',
			description: 'Set emoji a form',
			usage: [
				' [form id] - Views and optionally clears an existing emote',
				' [form id] [new emoji] - Sets emoji for the given form'
			],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true,
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[0]) return 'I need at least a form!';

		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';

		var val;
		if(!args[1]) {
			if(!form.emoji) return 'No emoji set!';
			var message = await msg.channel.send(
				`Current emoji: ${form.emoji}\n` +
				'Would you like to reset it?'
			);
			REACTS.forEach(r => message.react(r));

			var conf = await this.#bot.utils.getConfirmation(bot, message, msg.author);
			if(conf.msg) return conf.msg;

			val = null;
		} else {
			val = args[1].includes(':') ?
				  args[1].replace(/<:(.*)>/,'$1') :
				  args[1];
			if(form.emoji == val) return 'Form already using that emoji!';
		}

		try {
			form.emoji = val;
			await form.save();
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Emoji updated!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);