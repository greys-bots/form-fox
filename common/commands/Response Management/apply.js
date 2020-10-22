const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> 'Apply to a form',
	usage: ()=> [' [form id] - Apply to the given form'],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need a form to apply to!';

		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		var cfg = await bot.stores.configs.get(msg.guild.id);

		if(!form.channel_id && !cfg?.response_channel)
			return 'No response channel set for that form! Ask the mods to set one!';

		try {
			var existing = await bot.stores.openResponses.get(msg.author.dmChannel?.id);
			if(existing) return 'Please finish your current form before starting a new one!';
			
			await msg.author.send({embed: {
				title: form.name,
				description: form.description,
				fields: form.questions.map((q,i) => {
					return {
						name: `Question ${i+1}`,
						value: q.value
					}
				}),
				color: parseInt(form.color || 'ee8833', 16)
			}})
			
			var question = await bot.utils.handleQuestion(form, 0);
			var message = await msg.author.send({embed: {
				title: form.name,
				description: form.description,
				fields: question.message,
				color: parseInt(form.color || 'ee8833', 16),
				footer: question.footer
			}});
			
			question.reacts.forEach(r => message.react(r));
			await bot.stores.openResponses.create(msg.guild.id, message.channel.id, message.id, {
				user_id: msg.author.id,
				form: form.hid,
				questions: JSON.stringify(form.questions)
			})
		} catch(e) {
			console.log(e);
			return 'ERR! Couldn\'t start response process: '+(e.message || e);
		}

		return 'Application started! Check your DMs!';
	},
	alias: ['app', 'start', 'respond'],
	guildOnly: true
}
