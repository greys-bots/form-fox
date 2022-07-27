module.exports = async (member, bot) => {
	if(member.user.dmChannel) {
		var existing = await bot.stores.openResponses.get(member.user.dmChannel.id);
		if(existing?.id) return;
	}

	var cfg = await bot.stores.configs.get(member.guild.id);
	if(!cfg?.autodm) return;

	var form = await bot.stores.forms.get(member.guild.id, cfg.autodm);
	if(!form?.id) return;

	try {
		await bot.handlers.response.startResponse({
			cfg,
			form,
			user: member.user,
			auto: true,
			guild: member.guild
		})
	} catch(e) {
		console.log(e)
	}
}