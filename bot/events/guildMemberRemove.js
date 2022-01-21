module.exports = async (member, bot) => {
	if(!member.user.dmChannel) return;

	var channel = await member.user.dmChannel.fetch();
	var response = await bot.stores.openResponses.get(channel.id);
	if(!response) return;

	try {
		await bot.handlers.response.autoCancel({
			channel,
			response,
			user: member.user
		})
	} catch(e) {
		console.log(e);
	}
}