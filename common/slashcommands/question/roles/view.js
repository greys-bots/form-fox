const { qTypes: TYPES } = require('../../../extras');
const { Models: { SlashCommand } } = require('frame');

class Command extends SlashCommand {
	#bot;
	#stores;

	constructor(bot, stores) {
		super({
			name: 'view',
			description: "View roles associated with questions on a form",
			type: 1,
			options: [
				{
					name: 'form',
					description: "The form to check roles on",
					type: 3,
					required: true,
					autocomplete: true
				},
				{
					name: 'question',
					description: "The question number to view roles of",
					type: 4,
					required: false
				}
			],
			usage: [
				'[form] - View all roles attached to questions on the given form',
				'[form] [question] - View roles attached to a specific question on a form'
			],
			ephemeral: true
		})
		this.#bot = bot;
		this.#stores = stores;
	}

	async execute(ctx) {
		var f = ctx.options.getString('form')?.toLowerCase().trim();
		var q = ctx.options.getInteger('question');

		var form = await this.#stores.forms.get(ctx.guild.id, f);
		if(!form.id) return 'Form not found!';
		
		if(q === 0) q = 1;
		if(q > form.questions.length) q = form.questions.length;
		
		var questions = form.questions;
		if(q !== null) questions = [form.questions[q - 1]];
		questions = questions.filter(qu => qu?.roles?.length);
		if(!questions.length) return "No valid questions supplied!";

		var embeds = [];
		for(var qu of questions) {
			if(!qu.roles) {
				embeds.push({
					title: "Roles on form "+form.hid,
					description: "Question: "+qu.value,
					fields: {
						name: 'No roles',
						value: "Question has no roles attached"
					}
				});
				continue;
			}

			embeds.push({
				title: "Roles on form "+form.hid,
				description: "Question: "+qu.value,
				fields: TYPES[qu.type].showRoles(qu)
			})
		}

		if(embeds.length > 1) for(var i = 0; i < embeds.length; i++)
			embeds[i].title += ` ${i+1}/${embeds.length}`;

		return embeds;
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