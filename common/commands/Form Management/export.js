const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'export',
			description: "Export forms to import somewhere else",
			usage: [
				' - Exports all existing forms',
				' [form id] <form id> ... - Export specific form(s)',
				' resp - Export all forms and their responses',
				' resp [form id] <form id> ... - Export specific forms and their responses'
			],
			alias: ['exp'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true,
			cooldown: 10,
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		var resp;
		if(['resp', 'responses', 'response'].includes(args[0]?.toLowerCase())) {
			resp = true;
			args.shift();
		}

		var data = await this.#stores.forms.export(msg.channel.guild.id, args?.[0] ? args : undefined, resp);
		if(!data?.[0]) return 'No forms to export!';

		return {
			content: "Here's your file!",
			files: [
				{
					attachment: Buffer.from(JSON.stringify(data, null, 4)),
					name: "forms.json"
				}
			]
		};
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);