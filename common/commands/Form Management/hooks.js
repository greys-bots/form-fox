const EVENTS = require(__dirname + '/../../extras').events;

module.exports = {
	help: ()=> 'Manages hooks on a form',
	usage: ()=> [
		' [form id] - Views current hooks for a form',
		' [form id] [url] <events> - Sets the hook for the given form. Deletes all others',
		' add [form id] [url] <events> - Adds another hook to the form',
		' remove [form id] [hook id] - Removes a hook from the form'
	],
	desc: ()=>
		'The hook url is a place for me to send info for responses! ' +
		'I\'ll send a POST request to the address with the given info\n' +
		`Events to subscribe to: ${EVENTS.join(', ')}\n` +
		'If no events are given, it\'ll automatically subscribe to all!',
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need at least a form!';
		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		if(!args[1]) {
			var hooks = await bot.stores.hooks.getByForm(msg.guild.id, form.hid);
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

		if(bot.utils.checkUrl(args[1])) return 'I need a real url!';
		if(args.length > 2 && args.slice(2).find(a => !EVENTS.includes(a.toLowerCase())))
			return 'Invalid events given! See command help for more info';

		try {
			await bot.stores.hooks.deleteByForm(msg.guild.id, form.hid);
			var hook = await bot.stores.hooks.create(msg.guild.id, form.hid, {
				url: args[1],
				events: args.length > 2 ? args.slice(2).map(a => a.toLowerCase()) : ['submit', 'accept', 'deny']
			})
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Form hook set! ID: ' + hook.hid;;
	},
	alias: ['hook', 'link', 'links'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true,
	subcommands: {}
}

module.exports.subcommands.add = {
	help: () => 'Add a hook to a form',
	usage: () => [
		' [form id] [url] <events> - Adds a hook to the given form'
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return "I need at least a form and a url!";
		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';
		if(bot.utils.checkUrl(args[1])) return 'I need a real url!';
		console.log(args.slice(2))
		if(args.length > 2 && args.slice(2).find(a => !EVENTS.includes(a.toLowerCase())))
			return 'Invalid events given! See command help for more info';

		try {
			var hook = await bot.stores.hooks.create(msg.guild.id, form.hid, {
				url: args[1],
				events: args.length > 2 ? args.slice(2).map(a => a.toLowerCase()) : ['submit', 'accept', 'deny']
			})
		} catch(e) {
			if(e.message) return 'ERR! '+e.message;
			else if(typeof e == 'string') return 'ERR! '+e;
			else return 'ERRS!\n'+e.join('\n');
		}

		return 'Hook added! ID: ' + hook.hid;
	},
	alias: ['new', '+', 'create'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}

module.exports.subcommands.remove = {
	help: () => 'Remove a hook from a form',
	usage: () => [
		' [form id] [hook id] - Removes a hook from the given form'
	],
	execute: async (bot, msg, args) => {
		if(!args[1]) return "I need at least a form and a hook!";
		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';
		var hook = await bot.stores.hooks.get(msg.guild.id, form.hid, args[1].toLowerCase());
		if(!hook) return 'Hook not found!';

		try {
			await bot.stores.hooks.delete(msg.guild.id, form.hid, hook.hid);
		} catch(e) {
			return 'Err! '+e;
		}

		return 'Hook deleted!';
	},
	alias: ['delete', 'd', 'rmv', 'r', '-'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}