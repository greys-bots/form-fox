const REACTS = require(__dirname + '/../../extras').confirmReacts;

module.exports = {
	help: ()=> "Set what roles are added to users after completing specific forms",
	usage: ()=> [
		' - View current role configs',
		' [form id] - View or clear a form\'s roles',
		' [form id] [role] [role] ... - Set a form\'s roles. Best done with mentions or ids'
	],
	execute: async (bot, msg, args) => {
		switch(args.length) {
			case 0:
				var forms = await bot.stores.forms.getAll(msg.guild.id);
				var embeds = []

				for(var form of forms) {
					var roles = msg.guild.roles.cache.filter(r => form.roles.includes(r.id));
					embeds.push({embed: {
						title: `Roles for form ${form.name} (${form.hid})`,
						description: roles.map(r => r.mention).join('\n') || '*(none set)*',
						color: parseInt('ee8833', 16)
					}})
				}
				
				if(embeds.length > 1)
					for(var i = 0; i < embeds.length; i++)
						embeds[i].embed.title += ` (${i+1}/${embeds.length})`;

				return embeds;
				break;
			case 1:
				var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
				if(!form) return 'Form not found!';

				var roles = msg.guild.roles.cache.filter(r => form.roles.includes(r.id));
				await msg.channel.send({embeds: [{
					title: `Roles for form ${form.name} (${form.hid})`,
					description: roles.map(r => r.mention).join('\n') || '*(none set)*',
					color: parseInt('ee8833', 16)
				}]})

				if(roles[0]) {
					var message = await msg.channel.send('Would you like to clear these roles?');
					REACTS.forEach(r => message.react(r));
					
					var confirm = await bot.utils.getConfirmation(bot, msg, msg.author);
					if(confirm.msg) return confirm.msg;

					try {
						await bot.stores.forms.update(msg.guild.id, form.hid, {roles: []});
					} catch(e) {
						return 'ERR! '+e;
					}

					return 'Roles cleared!';
				}
				return;
				break;
			default:
				var form = await bot.stores.forms.get(msg.guild.id, args[0].toLowerCase());
				if(!form) return 'Form not found!';

				var roles = args.slice(1).map(a => {
					return msg.guild.roles.cache.find(r => {
						return [r.name.toLowerCase(), r.id]
							.includes(a.toLowerCase().replace(/[<@&>]/g, ''))
					})?.id
				}).filter(x => x);
				if(!roles[0]) return 'No valid roles given!';

				try {
					await bot.stores.forms.update(msg.guild.id, form.hid, {roles: roles});
				} catch(e) {
					return 'ERR! '+e;
				}

				return 'Roles set!';
				break;
		}
	},
	permissions: ['MANAGE_MESSAGES'],
	guildOnly: true
}