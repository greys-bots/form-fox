const {confirmVals:STRINGS, confirmReacts:REACTS} = require('../common/extras');

module.exports = {
	genEmbeds: async (bot, arr, genFunc, info = {}, fieldnum, extras = {}) => {
		return new Promise(async res => {
			var embeds = [];
			var current = { embed: {
				title: typeof info.title == "function" ?
								info.title(arr[0], 0) : info.title,
						description: typeof info.description == "function" ?
								info.description(arr[0], 0) : info.description,
				color: typeof info.color == "function" ?
						info.color(arr[0], 0) : info.color,
				footer: info.footer,
				fields: []
			}};
			
			for(let i=0; i<arr.length; i++) {
				if(current.embed.fields.length < (fieldnum || 10)) {
					current.embed.fields.push(await genFunc(arr[i], i, arr));
				} else {
					embeds.push(current);
					current = { embed: {
						title: typeof info.title == "function" ?
								info.title(arr[i], i) : info.title,
						description: typeof info.description == "function" ?
								info.description(arr[i], i) : info.description,
						color: typeof info.color == "function" ?
								info.color(arr[i], i) : info.color,
						footer: info.footer,
						fields: [await genFunc(arr[i], i, arr)]
					}};
				}
			}
			embeds.push(current);
			if(extras.order && extras.order == 1) {
				if(extras.map) embeds = embeds.map(extras.map);
				if(extras.filter) embeds = embeds.filter(extras.filter);
			} else {
				if(extras.filter) embeds = embeds.filter(extras.filter);
				if(extras.map) embeds = embeds.map(extras.map);
			}
			if(embeds.length > 1) {
				for(let i = 0; i < embeds.length; i++)
					embeds[i].embed.title += (extras.addition != null ? eval("`"+extras.addition+"`") : ` (page ${i+1}/${embeds.length}, ${arr.length} total)`);
			}
			res(embeds);
		})
	},
	paginateEmbeds: async function(bot, m, reaction) {
		switch(reaction.emoji.name) {
			case "⬅️":
				if(this.index == 0) {
					this.index = this.data.length-1;
				} else {
					this.index -= 1;
				}
				await m.edit(this.data[this.index]);
				if(m.channel.type != "dm") await reaction.users.remove(this.user)
				bot.menus[m.id] = this;
				break;
			case "➡️":
				if(this.index == this.data.length-1) {
					this.index = 0;
				} else {
					this.index += 1;
				}
				await m.edit(this.data[this.index]);
				if(m.channel.type != "dm") await reaction.users.remove(this.user)
				bot.menus[m.id] = this;
				break;
			case "⏹️":
				await m.delete();
				delete bot.menus[m.id];
				break;
		}
	},
	cleanText: function(text){
		if (typeof(text) === "string") {
			return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
		} else	{
			return text;
		}
	},

	checkPermissions: async (bot, msg, cmd)=>{
		return new Promise((res)=> {
			if(cmd.permissions) res(msg.member.permissions.has(cmd.permissions))
			else res(true);
		})
	},

	getConfirmation: async (bot, msg, user) => {
		return new Promise(res => {

			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('message', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				if(STRINGS[0].includes(message.content.toLowerCase())) return res({confirmed: true, message});
				else return res({confirmed: false, message, msg: 'Action cancelled!'});
			}

			function reactListener(react, ruser) {
				if(react.message.channel.id != msg.channel.id ||
				   ruser.id != user.id) return;

				clearTimeout(timeout);
				bot.removeListener('message', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				if(react.emoji.name == REACTS[0]) return res({confirmed: true, react});
				else return res({confirmed: false, react, msg: 'Action cancelled!'});
			}

			const timeout = setTimeout(async () => {
				bot.removeListener('message', msgListener);
				bot.removeListener('messageReactionAdd', reactListener);
				res({confirmed: false, msg: 'ERR! Timed out!'})
			}, 30000);

			bot.on('message', msgListener);
			bot.on('messageReactionAdd', reactListener);
		})
	},
	awaitMessage: async (bot, msg, user) => {
		return new Promise(res => {
			function msgListener(message) {
				if(message.channel.id != msg.channel.id ||
				   message.author.id != user.id) return;

				bot.removeListener('message', msgListener);
				return res(message)
			}

			bot.on('message', msgListener);
\		})
	},

	handleQuestion: async (data, number) => {
    	var questions = data.questions?.[0] ? data.questions : data.form.questions;
    	var current = questions[number];
    	if(!current) return Promise.resolve(undefined);

    	var question = {};

    	switch(current.type) {
    		case 'mc':
    		case 'cb':
    			question.message = [
    				{
    					name: `Question ${number + 1}${current.required ? ' (required)' : ''}`,
    					value: current.value
    				},
    				...current.choices.map((c, i) => {
    					return {name: `Option ${NUMBERS[i]}`, value: c}
    				})
    			]

    			if(current.other) question.message.push({name: 'Other', value: 'Enter a custom response (react with 🅾️)'})

    			question.reacts = [
    				...NUMBERS.slice(0, current.choices.length),
    				(current.other ? '🅾️' : null),
    				(current.type == 'cb' ? '✏️' : null),
    				'✅', '❌', '➡️'
    			].filter(x => x!=null);

    			question.footer = {text:
    				'react or type the respective emoji/character to choose an option! ' +
    				(current.type == 'cb' ? 'react with ✏️ to confirm selected choices! ' : '') +
                    'react with ✅ to finish early; ' +
                    'react with ❌ to cancel; ' +
                    'react with ➡️ to skip this question! ' +
                    'respective text keywords: submit, cancel, skip'
                }
    			break;
    		case 'num':
    			question.message = [
    				{
    					name: `Question ${number + 1}${current.required ? ' (required)' : ''}`,
    					value: current.value
    				}
    			]


    			question.reacts = ['✅', '❌', '➡️']

    			question.footer = {text:
    				'you can only respond with numbers for this question! ' +
                    'react with ✅ to finish early; ' +
                    'react with ❌ to cancel; ' +
                    'react with ➡️ to skip this question! ' +
                    'respective text keywords: submit, cancel, skip'
                }
    			break;
    		case 'dt':
    			question.message = [
    				{
    					name: `Question ${number + 1}${current.required ? ' (required)' : ''}`,
    					value: current.value
    				}
    			]


    			question.reacts = ['✅', '❌', '➡️']

    			question.footer = {text:
    				'you can only respond with a date for this question! ' +
                    'react with ✅ to finish early; ' +
                    'react with ❌ to cancel; ' +
                    'react with ➡️ to skip this question! ' +
                    'respective text keywords: submit, cancel, skip'
                }
    			break;
    		default:
    			question.message = [
    				{
    					name: `Question ${number + 1}${current.required ? ' (required)' : ''}`,
    					value: current.value
    				}
    			]


    			question.reacts = ['✅', '❌', '➡️']

    			question.footer = {text:
                    'react with ✅ to finish early; ' +
                    'react with ❌ to cancel; ' +
                    'react with ➡️ to skip this question! ' +
                    'respective text keywords: submit, cancel, skip'
                }
    			break;
    	}

    	Promise.resolve(question)
    }
}