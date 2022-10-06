const {qTypes:TYPES} = require(__dirname + '/../../extras');
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			name: 'forms',
			description: `List existing forms`,
			usage: [
				' - List all forms',
				' [form id] - View a specific form',
				' open - List open forms',
				' closed - List closed forms'
			],
			alias: ['list', 'l', 'f', 'form'],
			permissions: ['ManageMessages'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true,
			module
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		var forms = await this.#stores.forms.getAll(msg.channel.guild.id);
		if(!forms?.[0]) return "No forms created yet!";

		var query = args[0]?.toLowerCase();
		if(args[0]) {
			if(query == 'open') forms = forms.filter(f => f.open);
			else if(args[0].toLowerCase() == 'closed') forms = forms.filter(f => !f.open);
			else {
				var form = forms.find(f => f.hid == args[0].toLowerCase());
				if(!form?.id) return "Form not found!";

				var channel = msg.channel.guild.channels.resolve(form.channel_id);
				var responses = await this.#stores.responses.getByForm(msg.channel.guild.id, form.hid);

				var embeds = [{embed: {
					title: `${form.name} (${form.hid}) ` +
						   `${form.emoji?.includes(':') ? '<' + form.emoji + '>' : form.emoji || '📝'}`,
					description: form.description,
					fields: [
						{name: "Message", value: form.message || "*(not set)*"},
						{name: "Channel", value: `${channel ? channel : '*(not set)*'}`},
						{name: "Response count", value: (responses?.length.toString() || '0')},
						{name: "Roles", value: form.roles?.map(r => `<@&${r.id}>`).join('\n') || '*(not set)*'}
					],
					color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
					footer: {text: 'See next page for questions' + (form.open ? '' : '| This form is closed!')}
				}}];

				var qembeds = await this.#bot.utils.genEmbeds(this.#bot, form.questions, (data, i) => {
					return {
						name: `**${data.value}${data.required ? " (required)" : ""}**`,
						value: `**Type:** ${TYPES[data.type].alias[0]}\n\n` +
							   (data.choices ? `**Choices:**\n${data.choices.join("\n")}\n\n` : '') +
							   (data.other ? 'This question has an "other" option!' : '')
					}
				}, {
					title: `${form.name} (${form.hid})`,
					description: form.description,
					color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
					footer: {text: (form.open ? '' : '| This form is closed!')}
				}, 20)

				embeds = embeds.concat(qembeds);
				if(embeds.length > 1)
				for(var i = 0; i < embeds.length; i++)
					embeds[i].embed.title += ` (${i+1}/${embeds.length})`;
				
				return embeds;
			}
		}

		var embeds = [];

		for(var form of forms) {
			var channel = msg.channel.guild.channels.resolve(form.channel_id);
			var responses = await this.#stores.responses.getByForm(msg.channel.guild.id, form.hid);

			var embed = {embed: {
				title: `${form.name} (${form.hid}) ` +
					   `${form.emoji?.includes(':') ? '<:' + form.emoji + '>' : form.emoji || '📝'}`,
				description: form.description,
				fields: [
					{name: "Message", value: form.message || "*(not set)*"},
					{name: "Channel", value: `${channel ? channel : '*(not set)*'}`},
					{name: "Response count", value: (responses?.length.toString() || '0')},
					{name: "Roles", value: form.roles?.map(r => `<@&${r.id}>`).join('\n') || '*(not set)*'},
					{name: "Questions", value: `Use \`${this.#bot.prefix}form ${form.hid}\` to see questions`}
				],
				color: parseInt(!form.open ? 'aa5555' : form.color || '55aa55', 16),
				footer: {text: form.open ? '' : 'This form is closed!'}
			}}

			embeds.push(embed)
		}

		if(embeds.length > 1)
			for(var i = 0; i < embeds.length; i++)
				embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

		return embeds;
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);