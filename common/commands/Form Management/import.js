const fetch = require('node-fetch');

module.exports = {
	help: ()=> "Imports forms",
	usage: ()=> [
		" - Imports an archive of your forms from a .json file attached to the message",
		" [url] - Imports forms from a linked .json"],
	execute: async (bot, msg, args) => {
		let file = msg.attachments.first();
		if(!file) file = args[0];
		if(!file) return "Please attach or link to a .json file to import when running this command!";
		let data;
		try {
			data = (await (await fetch(file.url || file)).json());
		} catch(e) {
			console.log(e);
			return "Please attach a valid .json file!";
		}

		var message = await msg.channel.send("WARNING: This will overwrite your existing data. Are you sure you want to import these forms?");
		["✅","❌"].forEach(r => message.react(r));
		
		var confirm = await bot.utils.getConfirmation(bot, message, msg.author);
		if(confirm.msg) return confirm.msg;

		try {
			var results = await bot.stores.forms.import(msg.guild.id, data);
		} catch(e) {
			return "ERR!\n"+e;
		}
		
		return (
			"Forms imported!\n" +
			`Updated: ${results.updated}\n` +
			`Created: ${results.created}`
		);
	},
	alias: ['imp'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}