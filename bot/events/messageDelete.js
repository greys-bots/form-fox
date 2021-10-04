module.exports = async (message, bot) => {
	if(!message.channel.guild) return;
	await bot.stores.responsePosts.delete(message.channel.guild.id, message.channel.id, message.id);
	await bot.stores.formPosts.delete(message.channel.guild.id, message.channel.id, message.id);
}