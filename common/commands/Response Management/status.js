module.exports = {
	help: ()=> 'Check a response\'s status',
	usage: ()=> [' <guild id> [response id] - Check the given response\'s status'],
	desc: () => 'Remember: The guild ID is needed if checking in DMs!',
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a response to check!';
		if(msg.channel.type == 'dm' && !args[1]) return 'I need a guild to get the response from!';

		if(msg.channel.type == 'dm') {
			var response = await bot.stores.responses.get(args[0], args[1].toLowerCase());
		} else var response = await bot.stores.responses.get(msg.channel.guild.id, args[0].toLowerCase());

		if(!response.id) return 'Response not found!';

		return {embed: {
			title: 'Response Status',
			description: `Response ${response.hid} ${['accepted', 'denied'].includes(response.status) ? 'has been' : 'is currently'} **${response.status}**!`
		}}
	},
	alias: ['check']
}