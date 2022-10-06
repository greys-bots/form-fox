const REACTS = require(__dirname + '/../../extras').confirmReacts;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'delete',
			description: "Delete a form, and all its responses",
			usage: [
				' [form id] <form id> ... - Deletes given forms',
				' all | * - Delete all forms',
				' all | * -[form id] ... - Delete all except specific forms'
			],
			alias: ['del', 'remove'],
			permissions: ['ManageMessages'],
			opPerms: ['DELETE_FORMS'],
			guildOnly: true,
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[0]) return 'I need a form to delete!';
		args = args.map(a => a.toLowerCase());
		var message;
		var forms = (await this.#stores.forms.getAll(msg.channel.guild.id) || []);
		if(!forms?.[0]) return 'No forms to delete!';

		if(args.length == 1) {
			if(['all', '*'].includes(args[0])) {
				message = await msg.channel.send([
					'Are you sure you want to delete ALL your forms?\n',
					'WARNING: All response data will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;
			} else {
				var forms = forms.filter(f => f.hid == args[0]);
				if(!forms.length) return 'Form not found!';
				
				message = await msg.channel.send([
					'Are you sure you want to delete this form?\n',
					'WARNING: All response data for this form will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;
			}
		} else {
			if(['all', '*'].includes(args[0])) {
				var exceptions = args.slice(1).map(f => f.replace(/-\s?/g, ''));
				forms = forms.filter(f => !exceptions.includes(f.hid));

				message = await msg.channel.send([
					`Form IDs: ${forms.map(f => f.hid).join(', ')}\n`,
					'Are you sure you want to delete these forms?\n',
					'WARNING: All response data for these forms will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;
			} else {
				forms = forms.filter(f => args.includes(f.hid));
				message = await msg.channel.send([
					'Are you sure you want to delete these forms?\n',
					'WARNING: All response data for these forms will be lost! This cannot be undone!'
				].join(''));
				REACTS.forEach(r => message.react(r));

				var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
				if(confirm.msg) return confirm.msg;
			}
		}

		if(!forms?.[0]) return 'No forms to delete!';

		try {
			for(var form of forms) await form.delete();
		} catch(e) {
			return 'ERR! '+e;
		}

		return `Form${forms.length > 1 ? 's' : ''} deleted!`;
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);