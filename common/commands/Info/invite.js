module.exports = {
	help: ()=> "Get the bot's invite",
	usage: ()=> [" - Gets an invite for the bot"],
	execute: async (bot, msg, args)=> {
		return `You can invite me with this:\n${bot.invite}`;
	},
	alias: ['i', 'inv']
}