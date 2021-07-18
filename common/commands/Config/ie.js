const { confirmReacts: REACTS } = require('../../extras');
const VALS = ["1", "true", "y", "yes", "enable", "✅"];

module.exports = {
	help: () => "Turn off the info embed for forms",
	usage: () => [
		" - Views and optically clears current value",
		" [true|false] - Sets the value"
	],
	desc: ()=> `The "info embed" shows the user a list of questions they'll be answering, along with info `+
			   `about the form itself. Making this \`false\` means it won't be sent`,
	execute: async (bot, msg, args) => {
		var cfg = await bot.stores.configs.get(msg.guild.id);
		if(!cfg) cfg = {};

		if(!args[0]) {
			if(!cfg.embed && cfg.embed != false)
				return "Value isn't set!";

			var message = await msg.channel.send(`Current value: ${cfg.embed}\nDo you want to reset it?`);
			REACTS.forEach(r => message.react(r));
			var conf = await bot.utils.getConfirmation(bot, message, msg.author);
			if(conf.msg) return conf.msg;

			await bot.stores.configs.update(msg.guild.id, {embed: true});
			return "Config reset!";
		}

		var val;
		if(VALS.includes(args[0].toLowerCase())) val = true;
		else val = false;

		if(!cfg.server_id) await bot.stores.configs.create(msg.guild.id, {embed: val});
		else await bot.stores.configs.update(msg.guild.id, {embed: val});

		return "Config updated!"
	},
	guildOnly: true,
	permissions: ['MANAGE_GUILD'],
	alias: ['infoembed', 'embed']
}