const REACTS = require(__dirname + '/../../extras').confirmReacts;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'clear',
			description: "Clears responses",
			usage: [
				" - Deletes ALL responses across ALL forms",
				" [form id] - Deletes all responses for the given form"
			],
			permissions: ['ManageMessages'],
			opPerms: ['DELETE_RESPONSES'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(args[0]) {
			var form = await this.#stores.forms.get(msg.channel.guild.id, args[0]?.toLowerCase());
			if(!form.id) return 'Form not found!';

			var message = await msg.channel.send([
				"Are you sure you want to delete ",
				"ALL responses for this form? ",
				"You can't get them back!"
			].join(""));

			REACTS.forEach(r => message.react(r));

			var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
			if(confirm.msg) return confirm.msg;

			try {
				await this.#stores.responses.deleteByForm(msg.channel.guild.id, form.hid);
				await this.#stores.forms.updateCount(msg.channel.guild.id, form.hid);
			} catch(e) {
				return 'ERR! '+e;
			}

			return 'Responses deleted!';
		}

		var message = await msg.channel.send([
			"Are you sure you want to delete ",
			"ALL responses for EVERY form? ",
			"You can't get them back!"
		].join(""));

		REACTS.forEach(r => message.react(r));

		var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
		if(confirm.msg) return confirm.msg;

		var forms = await this.#stores.forms.getAll(msg.channel.guild.id);
		for(var form of forms) {
			try {
				await this.#stores.responses.deleteByForm(msg.channel.guild.id, form.hid);
				await this.#stores.forms.updateCount(msg.channel.guild.id, form.hid);
			} catch(e) {
				return 'ERR! '+e;
			}
		}

		return 'Responses deleted!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);