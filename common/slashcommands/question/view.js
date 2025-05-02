const { numbers: NUMS } = require('../../extras');
const TYPES = require('../../questions');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: "View a form's questions",
			options: [{
				name: 'form_id',
				description: "The form's ID",
				type: 3,
				required: true,
				autocomplete: true
			}],
			usage: [
				"[form_id] - View all questions on a form"
			],
			ephemeral: true,
			guildOnly: true,
			permissions: ['ManageMessages'],
			v2: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var id = ctx.options.get('form_id').value.toLowerCase().trim();
		var form = await this.#stores.forms.get(ctx.guildId, id);;
		if(!form.id) return 'Form not found!';
		await form.getQuestions();

		var color = parseInt(form.color, 16);
		if(isNaN(color)) color = 0x55aa55;

		var comps = this.#bot.utils.genComps(form.resolved.questions, (data, i) => {
			var text;
			if(!['mc', 'cb'].includes(data.type)) {
				text = "**Type:** " + TYPES[data.type].alias[0];
			} else {
				text = (data.options?.choices ? `**Choices:**\n${data.options.choices.join("\n")}\n\n` : '') +
					   (data.other ? 'This question has an "other" option!' : '')
			}

			var name = `${NUMS[i + 1]} **${data.name}**`;
			if(data.required) name += " :exclamation:";

			switch(data.type) {
				case 'mc':
					name += " :radio_button:";
					break;
				case 'cb':
					name += " :white_check_mark:";
					break;
				case 'text':
					name += " :pencil:";
					break;
				case 'dt':
					name += " :calendar:";
					break;
				case 'num':
					name += " :1234:";
					break;
				case 'img':
					name += " :frame_photo:";
					break;
				case 'att':
					name += " :link:"
					break;
			}

			return {
				type: 10,
				content: `### ${name}\n${text}`
			}
		})

		console.log(comps)

		return comps.map(c => ({
			components: [{
				type: 17,
				accent_color: color,
				components: [
					{
						type: 10,
						content: `## ${form.name} (${form.hid})\n${form.description}`
					},
					...c
				]
			}]
		}));
	}

	async auto(ctx) {
		var forms = await this.#stores.forms.getAll(ctx.guild.id);
		var foc = ctx.options.getFocused();
		if(!foc) return forms.map(f => ({ name: f.name, value: f.hid }));
		foc = foc.toLowerCase()

		if(!forms?.length) return [];

		return forms.filter(f =>
			f.hid.includes(foc) ||
			f.name.toLowerCase().includes(foc) ||
			f.description.toLowerCase().includes(foc)
		).map(f => ({
			name: f.name,
			value: f.hid
		}))
	}
}

module.exports = (bot, stores) => new Command(bot, stores);