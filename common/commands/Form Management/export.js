module.exports = {
	help: ()=> "Export forms to import somewhere else",
	usage: ()=> [
		' - Exports all existing forms',
		' [form id] <form id> ... - Export specific form(s)'
	],
	desc: ()=> "NOTE: This doesn't save responses! Just forms",
	execute: async (bot, msg, args) => {
		var data = await bot.stores.forms.export(msg.guild.id, args);
		if(!data?.[0]) return 'No forms to export!';

		return {
			content: "Here's your file!",
			files: [
				{
					attachment: Buffer.from(JSON.stringify(data)),
					name: "forms.json"
				}
			]
		};
	},
	alias: ['exp'],
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true,
	cooldown: 60
}