const WELCOMES = [
	"You're welcome!",
	"You're welcome! :fox:",
	"Of course!!",
	":D !!",
	"Eee! :orange_heart: :fox:"
];

const warnings = new Set();

module.exports = async (msg, bot)=>{
	if(msg.author.bot) return;
	var config = await bot.stores.configs.get(msg.channel.guild?.id);
	var prefix = new RegExp(`^<@!?(?:${bot.user.id})>`);
	var match = msg.content.match(prefix);
	var content = msg.content.replace(prefix, '').trim();
	if(!match) return;

	if(content == '') return msg.channel.send("Eee!");
	var thanks = msg.content.match(/^(thanks? ?(you|u)?|ty),? ?(form )?fox/i);
	if(thanks) return await msg.channel.send(WELCOMES[Math.floor(Math.random() * WELCOMES.length)]);

	return "Eee! Text commands are disabled, please use slash commands!";
}