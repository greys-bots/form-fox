const REACTS = require(__dirname + '/../../extras').confirmReacts;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'required',
			description: "Set required questions for a form",
			usage: [
				' [form id] - View or clear required questions for a form',
				' [form id] [question number] [question number] ... - Set certain questions as required'
			],
			permissions: ['MANAGE_MESSAGES'],
			opPerms: ['MANAGE_FORMS'],
			alias: ['req'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		if(!args[0]) return 'I need at least a form!';

		var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
		if(!form.id) return 'Form not found!';

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
			
			var confirm = await this.#bot.utils.getConfirmation(bot, msg, msg.author);
			if(confirm.msg) return confirm.msg;

			form.questions = form.questions.map(q => {
				q.required = false;
				return q;
			})

			try {
				await form.save()
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
			await form.save()
		} catch(e) {
			return 'ERR! '+e;
		}

		return 'Required questions set!';
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);