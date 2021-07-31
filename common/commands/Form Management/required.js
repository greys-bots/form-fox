const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> "Set required questions for a form",
	usage: ()=> [
		' [form id] - View or clear required questions for a form',
		' [form id] [question number] [question number] ... - Set certain questions as required'
	],
	execute: async (bot, msg, args) => {
		if(!args[0]) return 'I need at least a form!';

		var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
		if(!form) return 'Form not found!';

		if(!args[1]) {
			var required = form.questions.filter(q => q.required);
			if(!required?.[0]) return 'That form has no required questions!';

			var message = await msg.channel.send({embeds: [{
				title: 'Required Questions',
				fields: required.map((q, i) => {
					return {
						name: `Question ${i+1}`,
						value: q.value
					}
				}),
				footer: {text: [
                    'react with ✅ to clear required questions; ',
                    'react with ❌ to cancel. ',
                    'you can respond with "y", "yes", or "✅" to clear as well'
                ].join("")}
			}]});

			REACTS.forEach(r => message.react(r));
			
			var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm) return confirm;

			try {
				await bot.stores.forms.update(msg.guild.id, form.hid, {required: []});
			} catch(e) {
				return 'ERR! '+e;
			}

			return 'Required questions cleared!';
		}

		var required = args.slice(1).filter(x => {
			x = parseInt(x);
			return !isNaN(x) && x > 0 && x <= form.questions.length;
		});
		if(!required) return `Make sure you give valid question numbers! Valid numbers for this form should be between 1 and ${form.questions.length}`;

		for(var r of required) {
			form.questions[r-1].required = true;
		}

		try {
			await bot.stores.forms.update(msg.guild.id, form.hid, {required});
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Required questions set!';
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}