const EVENTS = require(__dirname + '/../../extras').events;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'hooks',
			description: 'Manages hooks on a form',
			usage: [
				' [form id] - Views current hooks for a form',
				' [form id] [url] <events> - Sets the hook for the given form. Deletes all others',
				' add [form id] [url] <events> - Adds another hook to the form',
				' remove [form id] [hook id] - Removes a hook from the form'
			],
			extra:
				'The hook url is a place for me to send info for responses! ' +
				'I\'ll send a POST request to the address with the given info\n' +
				`Events to subscribe to: ${EVENTS.join(', ')}\n` +
				'If no events are given, it\'ll automatically subscribe to all!',
			alias: ['hook', 'link', 'links'],
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

		if(!args[1]) {
			var hooks = await this.#stores.hooks.getByForm(msg.channel.guild.id, form.hid);
			if(!hooks?.[0]) return 'No hooks registered!';

			return hooks.map(h => {
				return {embed: {
					title: `Hook ${h.hid}`,
					description: `*Belongs to form ${h.form}*`,
					fields: [
						{name: 'URL', value: h.url},
						{name: 'Events', value: h.events.join(', ')}
					]
				}}
			})
		}

		if(this.#bot.utils.checkUrl(args[1])) return 'I need a real url!';
		if(args.length > 2 && args.slice(2).find(a => !EVENTS.includes(a.toLowerCase())))
			return 'Invalid events given! See command help for more info';

		try {
			await this.#stores.hooks.deleteByForm(msg.channel.guild.id, form.hid);
			var hook = await this.#stores.hooks.create({
				server_id: msg.channel.guild.id,
				form: form.hid,
				url: args[1],
				events: args.length > 2 ? args.slice(2).map(a => a.toLowerCase()) : ['submit', 'accept', 'deny']
			})
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form hook set! ID: ' + hook.hid;;
	}
}

class AddCommand extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'add',
			description: 'Add a hook to a form',
			usage: [
				' [form id] [url] <events> - Adds a hook to the given form'
			],
			alias: ['new', '+', 'create'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true
		});

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[1]) return "I need at least a form and a url!";
		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';
		if(this.#bot.utils.checkUrl(args[1])) return 'I need a real url!';
		if(args.length > 2 && args.slice(2).find(a => !EVENTS.includes(a.toLowerCase())))
			return 'Invalid events given! See command help for more info';

		try {
			var hook = await this.#stores.hooks.create({
				server_id: msg.channel.guild.id,
				form: form.hid,
				url: args[1],
				events: args.length > 2 ? args.slice(2).map(a => a.toLowerCase()) : ['submit', 'accept', 'deny']
			})
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Hook added! ID: ' + hook.hid;
	}
}

class RemoveCommand extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'remove',
			description: 'Remove a hook from a form',
			usage: [
				' [form id] [hook id] - Removes a hook from the given form'
			],
			alias: ['delete', 'd', 'rmv', 'r', '-'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[1]) return "I need at least a form and a hook!";
		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';
		var hook = await this.#stores.hooks.get(msg.channel.guild.id, form.hid, args[1].toLowerCase());
		if(!hook.id) return 'Hook not found!';

		try {
			await hook.delete()
		} catch(e) {
			return 'Err! '+e;
		}

		return 'Hook deleted!';
	}
}

module.exports = (bot, stores, mod) => {
	var cmd = new Command(bot, stores, mod)
		.addSubcommand(new AddCommand(bot, stores))
		.addSubcommand(new RemoveCommand(bot, stores));

	return cmd;
}