const REACTS = require(__dirname + '/../../extras').confirmReacts;
const { Models: { TextCommand } } = require('frame');

class Command extends TextCommand {
	#bot;
	#stores;

	constructor(bot, stores, module) {
		super({
			module,
			name: 'roles',
			description: "Set what roles are added to users after completing specific forms",
			usage: [
				' - View current role configs',
				' [form id] - View or clear a form\'s roles',
				' [form id] [role] [role] ... - Set a form\'s roles. Best done with mentions or ids'
			],
			permissions: ['MANAGE_MESSAGES'],
			opPerms: ['MANAGE_FORMS'],
			guildOnly: true
		})

		this.#bot = bot;
		this.#stores = stores;
	}

	async execute({msg, args}) {
		switch(args.length) {
			case 0:
				var forms = await this.#stores.forms.getAll(msg.channel.guild.id);
				var embeds = []

				for(var form of forms) {
					embeds.push({embed: {
						title: `Roles for form ${form.name} (${form.hid})`,
						description: form.roles.map(r => `<@&${r.id}>`).join('\n') || '*(none set)*',
						color: parseInt('ee8833', 16)
					}})
				}
				
				if(embeds.length > 1)
					for(var i = 0; i < embeds.length; i++)
						embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

				return embeds;
				break;
			case 1:
				var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
				if(!form.id) return 'Form not found!';

				await msg.channel.send({embeds: [{
					title: `Roles for form ${form.name} (${form.hid})`,
					description: form.roles.map(r => `<@&${r.id}>`).join('\n') || '*(none set)*',
					color: parseInt('ee8833', 16)
				}]})

				if(form.roles[0]) {
					var message = await msg.channel.send('Would you like to clear these roles?');
					REACTS.forEach(r => message.react(r));
					
					var confirm = await this.#bot.utils.getConfirmation(this.#bot, msg, msg.author);
					if(confirm.msg) return confirm.msg;

					try {
						form.roles = [];
						await form.save()
					} catch(e) {
						return 'ERR! '+e;
					}

					return 'Roles cleared!';
				}
				return;
				break;
			default:
				var form = await this.#stores.forms.get(msg.channel.guild.id, args[0].toLowerCase());
				if(!form.id) return 'Form not found!';

				var roles = args.slice(1).map(a => {
					return msg.channel.guild.roles.cache.find(r => {
						return [r.name.toLowerCase(), r.id]
							.includes(a.toLowerCase().replace(/[<@&>]/g, ''))
					})?.id
				}).filter(x => x);
				if(!roles[0]) return 'No valid roles given!';

				form.roles = roles.map(r => ({id: r, events: ['ACCEPT']}));
				try {
					await form.save()
				} catch(e) {
					return 'ERR! '+e;
				}

				return 'Roles set!';
				break;
		}
	}
}

module.exports = (bot, stores, mod) => new Command(bot, stores, mod);