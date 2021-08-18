const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> 'Apply to a form',
	usage: ()=> [' [form id] - Apply to the given form'],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to apply to!';

		var form = await bot.stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var cfg = await bot.stores.configs.get(msg.channel.guild.id);

		var resp = await bot.handlers.response.startResponse({
			user: msg.author,
			form,
			cfg
		});
		
		if(resp) return resp;
		else return;
	},
	alias: ['app', 'start', 'respond'],
	guildOnly: true
}
