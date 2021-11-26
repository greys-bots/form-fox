const {
	confirmVals:STRINGS,
	confirmReacts:REACTS,
	numbers:NUMBERS,
	qTypes: TYPES
} = require('../../common/extras');

class ResponseHandler {
	menus = new Set();
	constructor(bot) {
		this.bot = bot;

		bot.on('messageReactionAdd', async (...args) => {
            try {
                this.handleReactions(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

		bot.on('messageReactionRemove', async (...args) => {
            try {
                this.handleReactionRemove(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

        bot.on('messageCreate', async (...args) => {
            try {
                this.handleMessage(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })
	}

    async startResponse(ctx) {
        var {user, form, cfg} = ctx;

        if(!form.channel_id && !cfg?.response_channel)
            return 'No response channel set for that form! Ask the mods to set one!';

        if(!form.questions?.[0]) return "That form has no questions! Ask the mods to add some first!"; 

        try {
            var existing = await this.bot.stores.openResponses.get(user.dmChannel?.id);
            if(existing) return 'Please finish your current form before starting a new one!';

            if(form.cooldown && form.cooldown > 0) {
                var past = (await this.bot.stores.responses.getByUser(form.server_id, user.id))?.pop();
                if(past && past.status == 'denied') {
                    var diff = this.bot.utils.dayDiff(new Date(), past.received.getTime() + (form.cooldown * 24 * 60 * 60 * 1000));
                    if(diff > 0) return `Cooldown not up yet! You must wait ${diff} day${diff == 1 ? '' : 's'} to apply again`;
                }
            }
            
            if(cfg?.embed || form.embed) {
                await user.send({embeds: [{
                    title: form.name,
                    description: form.description,
                    fields: form.questions.map((q,i) => {
                        return {
                            name: `Question ${i+1}${form.required?.includes(i+1) ? " (required)" : ""}`,
                            value: q.value
                        }
                    }),
                    color: parseInt(form.color || 'ee8833', 16)
                }]})
            }
            
            var question = await this.handleQuestion(form, 0);
            var message = await user.send({embeds: [{
                title: form.name,
                description: form.description,
                fields: question.message,
                color: parseInt(form.color || 'ee8833', 16),
                footer: question.footer
            }]});
            
            question.reacts.forEach(r => message.react(r));
            await this.bot.stores.openResponses.create(form.server_id, message.channel.id, message.id, {
                user_id: user.id,
                form: form.hid,
                questions: JSON.stringify(form.questions)
            })
        } catch(e) {
            console.log(e);
            return 'ERR! Couldn\'t start response process: '+(e.message || e);
        }

        this.bot.emit('APPLY', {
            server_id: form.server_id,
            user_id: user.id,
            form: form
        })
        return 'Application started! Check your DMs!';
    }

	async sendQuestion(response, message) {
    	var questions = response.questions?.[0] ? response.questions : response.form.questions;

    	var question = await this.handleQuestion(response, response.answers.length);
        if(question) {
            var msg = await message.channel.send({embeds: [{
                title: response.form.name,
                description: response.form.description,
                fields: question.message,
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: question.footer
            }]});

            question.reacts.forEach(r => msg.react(r));
            
            return msg;
        } else {
        	var content = {content: "How's this look?", embeds: [{
                title: response.form.name,
                description: response.form.description,
                fields: [],
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: {text: [
                    'react with ✅ to finish; ',
                    'react with ❌ to cancel. ',
                    'respective keywords: submit, cancel'
                ].join(' ')}
            }]};

            for(var i = 0; i < questions.length; i++) {
            	if(!response.answers[i]?.length) {
            		content.embeds[0].fields.push({
                        name: questions[i].value,
                        value: '*(answer skipped!)*'
                    })
            	} else if(response.answers[i].length < 1024) {
           			content.embeds[0].fields.push({
                        name: questions[i].value,
                        value: response.answers[i] || '*(answer skipped!)*'
                    })
           		} else {
           			var chunks = response.answers[i].match(/(.|[\r\n]){1,1024}/gm);
           			for(var j = 0; j < chunks.length; j++ ) {
           				content.embeds[0].fields.push({
	                        name: questions[i].value + (j > 0 ? ' (cont.)' : ''),
	                        value: chunks[j]
	                    })
           			}
           		}
            }

            var msg = await message.channel.send(content);
            ['✅','❌'].forEach(r => msg.react(r));

            return msg;
        }
    }

    async sendResponse(response, message, user, config) {
    	var questions = response.questions?.[0] ? response.questions : response.form.questions;

        if(questions.find((q, i) => q.required && i+1 > response.answers.length))
            return 'You still have required questions to answer!';
        var prompt = await message.channel.messages.fetch(response.message_id);

        if(response.answers.length < questions.length) {
            var msg = await message.channel.send([
                "You're not done with this form yet!",
                "Would you like to skip the rest of the questions?"
            ].join("\n"));

            ['✅','❌'].forEach(r => msg.react(r));

	        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
	        if(confirm.msg) return Promise.resolve(confirm.msg);
        }

        var fields = [];

        var content = {embeds: [{
            title: response.form.name,
            description: response.form.description,
            fields: [],
            color: parseInt(response.form.color || 'ee8833', 16),
            footer: {text: 'Awaiting acceptance/denial...'}
        }]}

        for(var i = 0; i < questions.length; i++) {
       		if(!response.answers[i]?.length) {
				fields.push({
					name: questions[i].value,
					value: '*(answer skipped!)*'
				})
			} else if(response.answers[i].length < 1024) {
				fields.push({
					name: questions[i].value,
					value: response.answers[i]
				})
			} else {
				var chunks = response.answers[i].match(/(.|[\r\n]){1,1024}/gm);
				for(var j = 0; j < chunks.length; j++ ) {
					fields.push({
						name: questions[i].value + (j > 0 ? ' (cont.)' : ''),
						value: chunks[j]
					})
				}
			}
        }

		content.embeds[0].fields = fields;
        await prompt.edit(content);

        var respembed =  {
            title: "Response received!",
            description: [
                `Form name: ${response.form.name}`,
                `Form ID: ${response.form.hid}`,
                `User: ${user.username}#${user.discriminator} (${user})`
            ].join('\n'),
            color: parseInt('ccaa00', 16),
            fields,
            timestamp: new Date().toISOString(),
            footer: {text: 'Awaiting acceptance/denial...'}
        };

        try {
            var code = this.bot.utils.genCode(this.bot.chars);
            var created = await this.bot.stores.responses.create(response.server_id, {
                user_id: user.id,
                form: response.form.hid,
                questions: JSON.stringify(response.form.questions),
                answers: response.answers[0] ? response.answers :
                         new Array(questions.length).fill("*(answer skipped!)*"),
                status: 'pending'
            });
            this.bot.emit('SUBMIT', created);
            respembed.description += `\nResponse ID: ${created.hid}`;
            var guild = this.bot.guilds.resolve(response.server_id);
            if(!guild) return Promise.reject("ERR! Guild not found! Aborting!");
            var chan_id = response.form.channel_id || config?.response_channel;
            var channel = guild.channels.resolve(chan_id);
            if(!channel) return Promise.reject("ERR! Guild response channel missing! Aborting!");
            var rmsg = await channel.send({embeds: [respembed]});
            ['✅','❌'].forEach(r => rmsg.react(r));
            await this.bot.stores.responsePosts.create(rmsg.channel.guild.id, channel.id, rmsg.id, {
                response: created.hid
            })
            await this.bot.stores.forms.updateCount(rmsg.channel.guild.id, response.form.hid);
        } catch(e) {
            console.log(e.message || e);
            return Promise.reject('ERR! '+(e.message || e));
        }

        await this.bot.stores.openResponses.delete(response.channel_id);
        return (
            'Response sent! Response ID: '+created.hid +
            '\nUse this code to make sure your response has been received'
        )
    }

    async cancelResponse(response, message, user, config) {
        var prompt = await message.channel.messages.fetch(response.message_id);

        var msg = await message.channel.send([
            'Would you like to cancel your response?\n',
            'WARNING: This will delete all your progress. ',
            'If you want to fill out this form, you\'ll have to start over'
        ].join(""));
        ['✅','❌'].forEach(r => msg.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        try {
            await this.bot.stores.openResponses.delete(response.channel_id);
            await prompt.edit({embeds: [{
                title: "Response cancelled",
                description: "This form response has been cancelled!",
                color: parseInt('aa5555', 16),
                timestamp: new Date().toISOString()
            }]});
        } catch(e) {
            console.log(e);
            return Promise.reject('ERR! '+(e.message || e));
        }

        this.menus.delete(message.channel.id);
        return Promise.resolve('Response cancelled!');
    }

    async skipQuestion(response, message, user, config) {
    	var questions = response.questions?.[0] ? response.questions : response.form.questions;
    	if(questions.length < response.answers.length + 1) return Promise.resolve();

        if(questions[response.answers.length].required)
            return Promise.resolve('This question can\'t be skipped!');

        var m = await message.channel.send([
            'Are you sure you want to skip this question? ',
            "You can't go back to answer it!"
        ].join(""));
        ['✅','❌'].forEach(r => m.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, m, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        response.answers.push('*(answer skipped)*');
    	var msg = await this.sendQuestion(response, message);
    	await this.bot.stores.openResponses.update(message.channel.id, {message_id: msg.id, answers: response.answers});

    	return;
    }

    async handleQuestion(data, number) {
    	var questions = data.questions?.[0] ? data.questions : data.form.questions;
    	var current = questions[number];
    	if(!current) return Promise.resolve(undefined);

    	var question = {};
    	var type = TYPES[current.type];

    	question.message = [
    		{
				name: `Question ${number + 1}${current.required ? ' (required)' : ''}`,
				value: current.value
			}
    	];
    	if(type.message) question.message = question.message.concat(type.message(current));

    	question.reacts = ['❌'];
    	if(type.reacts) question.reacts = [...type.reacts(current), ...question.reacts];

    	question.footer = {text: 'react with ❌ or type "cancel" to cancel.'};
    	if(type.text) question.footer.text = type.text + " " + question.footer.text;

    	if(!current.required) {
    		if(!questions.find((x, i) => x.required && i > number)) {
    			question.footer.text += ' react with ✅ or type "submit" to finish early.';
    			question.reacts.push('✅');
    		}

    		question.footer.text += ' react with ➡️ or type "skip" to skip this question!';
    		question.reacts.push('➡️');
    	}

    	return question
    }

    async handleReactions(reaction, user) {
        if(this.bot.user.id == user.id) return;
        if(user.bot) return;
        if(user.partial) user = await user.fetch(true);

        var msg;
        if(reaction.message.partial) msg = await reaction.message.fetch();
        else msg = reaction.message;

        if(this.menus.has(msg.channel.id)) {
            return;
        }

        var response = await this.bot.stores.openResponses.getByMessage(msg.channel.id, msg.id);
        if(!response) return;

        var questions = response.questions?.[0] ? response.questions : response.form.questions;
        if(!questions?.[0]) {
            await this.bot.stores.openResponses.delete(msg.channel.id);
            return msg.channel.send("That form is invalid! This response is now closed");
        }

        var question = questions[response.answers.length]; // current question

        var config = await this.bot.stores.configs.get(response.server_id);

        switch(reaction.emoji.name) {
            case '✅':
                this.menus.add(msg.channel.id);
                try {
                    var res = await this.sendResponse(response, msg, user, config);
                } catch(e) {
                    await msg.channel.send(e.message || e);
                }
                this.menus.delete(msg.channel.id);
                await msg.channel.send(res);
                return;
            case '❌':
                this.menus.add(msg.channel.id);
                try {
                    var res = await this.cancelResponse(response, msg, user, config);
                } catch(e) {
                    await msg.channel.send(e.message || e);
                }
                this.menus.delete(msg.channel.id);
                await msg.channel.send(res);
                return;
            case '➡️':
                this.menus.add(msg.channel.id);
                try {
                    var res = await this.skipQuestion(response, msg, user, config);
                } catch(e) {
                    await msg.channel.send(e.message || e);
                }
                this.menus.delete(msg.channel.id);
                if(res) await msg.channel.send(res);
                return;
        }

        var type = TYPES[question.type];
        if(!type.handleReactAdd) return;

        var res2 = await type.handleReactAdd(msg, response, question, reaction);
        if(!res2) return;
        response = res2.response;

        if(res2.menu) this.menus.add(msg.channel.id);

        var message;
        if(res2.send) var message = await this.sendQuestion(response, msg);

        await this.bot.stores.openResponses.update(msg.channel.id, {
            message_id: message?.id || msg.id,
            answers: response.answers,
            selection: response.selection
        });
    }

    // for deselecting options
    async handleReactionRemove(reaction, user) {
    	if(this.bot.user.id == user.id) return;
        if(user.bot) return;

        var msg;
        if(reaction.message.partial) msg = await reaction.message.fetch();
        else msg = reaction.message;

        if(this.menus.has(msg.channel.id)) {
            return;
        }

        var response = await this.bot.stores.openResponses.getByMessage(msg.channel.id, msg.id);
        if(!response) return;

        var questions = response.questions?.[0] ? response.questions : response.form.questions;
        if(!questions?.[0]) {
            await this.bot.stores.openResponses.delete(msg.channel.id);
            return msg.channel.send("That form is invalid! This response is now closed");
        }

        var question = questions[response.answers.length]; // current question
        if(!question) return;
        var type = TYPES[question.type];
        if(!type.handleReactRemove) return;

        var res = await type.handleReactRemove(msg, response, question, reaction);
        if(!res) return;
        response = res.response;

        await this.bot.stores.openResponses.update(msg.channel.id, {
            answers: response.answers,
            selection: response.selection
        });
    }

    async handleMessage(message) {
        if(this.bot.user.id == message.author.id) return;
        if(message.author.bot) return;
        if(message.content.toLowerCase().startsWith(this.bot.prefix)) return; //in case they're doing commands

        var response = await this.bot.stores.openResponses.get(message.channel.id);
        if(!response) return;

        var questions = response.questions?.[0] ? response.questions : response.form.questions;
        if(!questions?.[0]) {
            await this.bot.stores.openResponses.delete(message.channel.id);
            return message.channel.send("That form is invalid! This response is now closed");
        }
        var question = questions[response.answers.length];
        var config = await this.bot.stores.configs.get(response.server_id);

        var msg;
        if(this.menus.has(message.channel.id)) {
        	if(!response.selection?.includes('OTHER')) return;
        	if(!question) return;

        	var prompt = await message.channel.messages.fetch(response.message_id);
        	var embed = prompt.embeds[0];

        	if(message.content.toLowerCase() == 'cancel') {
				embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
        		await prompt.edit({embeds: [embed]});
        		response.selection = response.selection.filter(x => x != 'OTHER');
        		await this.bot.stores.openResponses.update(message.channel.id, {selection: response.selection});
        		this.menus.delete(message.channel.id);
        		return;
        	}

        	response.selection[response.selection.indexOf('OTHER')] = message.content;
        	embed.fields[embed.fields.length - 1].value = message.content;
        	await prompt.edit({embeds: [embed]});
        	this.menus.delete(message.channel.id);

        	if(question.type == 'mc') {
        		response.answers.push(message.content);
        		response.selection = [];
        		msg = await this.sendQuestion(response, message);
        	}
        	await this.bot.stores.openResponses.update(message.channel.id, {
        		message_id: msg?.id ?? response.message_id,
        		selection: response.selection,
				answers: response.answers
        	});
        	return;
        }

        switch(message.content.toLowerCase()) {
            case 'submit':
                this.menus.add(message.channel.id);
                try {
                    var res = await this.sendResponse(response, message, message.author, config);
                } catch(e) {
                    await message.channel.send(e.message || e);
                }
                this.menus.delete(message.channel.id);
                if(res) await message.channel.send(res);
                return;
                break;
            case 'cancel':
                this.menus.add(message.channel.id);
                try {
                    var res = await this.cancelResponse(response, message, message.author, config);
                } catch(e) {
                    await message.channel.send(e.message || e);
                }
                this.menus.delete(message.channel.id);
                if(res) await message.channel.send(res);
                return;
                break;
            case 'skip':
                this.menus.add(message.channel.id);
                try {
                    var res = await this.skipQuestion(response, message, message.author, config);
                } catch(e) {
                    this.menus.delete(message.channel.id);
                    await message.channel.send(e.message || e);
                }
                this.menus.delete(message.channel.id);
                if(res) await message.channel.send(res);
                return;
                break;
        }

        if(questions.length < response.answers.length + 1) return;
        var type = TYPES[question.type];

        if(!type.handleMessage) return;

        var res2 = await type.handleMessage(message, response, question);
        if(!res2) return;
        response = res2.response;

        if(res2.menu) this.menus.add(message.channel.id);

        if(res2.send) msg = await this.sendQuestion(response, message);

        await this.bot.stores.openResponses.update(message.channel.id, {
            message_id: msg?.id ?? response.message_id,
            answers: response.answers,
            selection: response.selection
        });
    }
}

module.exports = (bot) => new ResponseHandler(bot);