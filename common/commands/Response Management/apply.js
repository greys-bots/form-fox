const REACTS = require(__dirname + '/../../extras').confirmReacts;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'apply',
			description: 'Apply to a form',
			usage: [' [form id] - Apply to the given form'],
			alias: ['app', 'start', 'respond'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		var form;
		if(!args[0]) {
			form = await this.#stores.forms.getByApplyChannel(msg.guild.id, msg.channel.id);
			if(!form.id) return "Please supply a form ID, or use this in a form's apply channel!";
		} else {
			form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
			if(!form.id) return 'Form not found!';
		}

		// if(form.apply_channel && form.apply_channel != msg.channel.id) {
		// 	var message = await msg.channel.send(`This isn't the right channel for that form! Please apply in <#${form.apply_channel}>`);

		// 	setTimeout(async () => {
		// 		await msg.delete();
		// 		await message.delete();
		// 	}, 15000)
		// 	return;
		// }

		var cfg = await this.#stores.configs.get(msg.channel.guild.id);

		var resp = await this.#bot.handlers.response.startResponse({
			user: msg.author,
			form,
			cfg
		});
		
		if(resp) return resp;
		else return;
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);
