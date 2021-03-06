const { numbers: NUMBERS, qTypes: TYPES } = require('../extras');
const { Collection } = require("discord.js");

var menus = [];

class OpenResponseStore extends Collection {
    /*
        Handles open forms
        Users shouldn't be able to open new forms
            unless they're finished with one already
        Doesn't utilize timeouts on message sends-
            instead handles incoming messages by checking
            to see if there's an open app and going from there
        Will send to a server or discard once done
    */

    constructor(bot, db) {
        super();

        this.db = db;
        this.bot = bot;
    };

    async init() {
        this.bot.on('messageReactionAdd', async (...args) => {
            try {
                this.handleReactions(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

		this.bot.on('messageReactionRemove', async (...args) => {
            try {
                this.handleReactionRemove(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })

        this.bot.on('message', async (...args) => {
            try {
                this.handleMessage(...args);
            } catch(e) {
                console.log(e.message || e);
            }
        })
    }

    async create(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO open_responses (
                    server_id,
                    channel_id,
                    message_id,
                    user_id,
                    form,
                    questions,
                    answers
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [server, channel, message, data.user_id, data.form, data.questions || [], data.answers || []]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res(await this.get(channel));
        })
    }

    async index(server, channel, message, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`INSERT INTO open_responses (
                    server_id,
                    channel_id,
                    message_id,
                    user_id,
                    form,
                    questions,
                    answers
                ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [server, channel, message, data.user_id, data.form, data.questions || [], data.answers || []]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res();
        })
    }

    async get(channel, forceUpdate = false) {
        return new Promise(async (res, rej) => {
            if(!forceUpdate) {
                var response = super.get(`${channel}`);
                if(response) {
                    var form = await this.bot.stores.forms.get(response.server_id, response.form);
                    if(form) response.form = form;
                    return res(response);
                }
            }
            
            try {
                var data = await this.db.query(`SELECT * FROM open_responses WHERE channel_id = $1`,[channel]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
                if(form) data.rows[0].form = form;
                this.set(`${channel}`, data.rows[0])
                res(data.rows[0])
            } else res(undefined);
        })
    }

    async getByMessage(channel, message) {
        return new Promise(async (res, rej) => {
            try {
                var data = await this.db.query(`SELECT * FROM open_responses WHERE channel_id = $1 AND message_id = $2`,[channel, message]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var form = await this.bot.stores.forms.get(data.rows[0].server_id, data.rows[0].form);
                if(form) data.rows[0].form = form;
                res(data.rows[0])
            } else res(undefined);
        })
    }

    async getByForm(server, hid) {
        return new Promise(async (res, rej) => {
            try {
                var data = await this.db.query(`SELECT * FROM open_responses WHERE server_id = $1 AND form = $2`,[server, hid]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            if(data.rows && data.rows[0]) {
                var form = await this.bot.stores.forms.get(server, hid);
                for(var i = 0; i < data.rows.length; i++) {
                    if(form) data.rows[i].form = form;
                }

                res(data.rows)
            } else res(undefined);
        })
    }

    async update(channel, data = {}) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`UPDATE open_responses SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE channel_id = $1`,[channel, ...Object.values(data)]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }

            res(await this.get(channel, true));
        })
    }

    async delete(channel) {
        return new Promise(async (res, rej) => {
            try {
                await this.db.query(`DELETE FROM open_responses WHERE channel_id = $1`, [channel]);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            super.delete(`${channel}`);
            res();
        })
    }

    async deleteByForm(server, hid) {
        return new Promise(async (res, rej) => {
            try {
                var responses = await this.getByForm(server, hid);
                if(!responses?.[0]) return res();
                await this.db.query(`
                    DELETE FROM open_responses
                    WHERE server_id = $1
                    AND form = $2
                `, [server, hid]);
                if(responses)
                    for(var response of responses)
                        super.delete(response.channel_id);
            } catch(e) {
                console.log(e);
                return rej(e.message);
            }
            
            res();
        })
    }

    async sendQuestion(response, message) {
    	var questions = response.questions?.[0] ? response.questions : response.form.questions;

    	var question = await this.bot.utils.handleQuestion(response, response.answers.length);
        if(question) {
            var msg = await message.channel.send({embed: {
                title: response.form.name,
                description: response.form.description,
                fields: question.message,
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: question.footer
            }});

            question.reacts.forEach(r => msg.react(r));
            
            return Promise.resolve(msg);
        } else {
        	var content = {content: "How's this look?", embed: {
                title: response.form.name,
                description: response.form.description,
                fields: questions.map((q, i) => {
                    return {
                        name: q.value,
                        value: response.answers[i] || '*(answer skipped!)*'
                    }
                }),
                color: parseInt(response.form.color || 'ee8833', 16),
                footer: {text: [
                    'react with ✅ to finish; ',
                    'react with ❌ to cancel. ',
                    'respective keywords: submit, cancel'
                ].join(' ')}
            }};

            var msg = await message.channel.send(content);
            ['✅','❌'].forEach(r => msg.react(r));

            return Promise.resolve(msg);
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
        } else {
            var msg = await message.channel.send([
                "Are you sure you're ready to submit this form?"
            ].join('\n'));
        }

        ['✅','❌'].forEach(r => msg.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        await prompt.edit({embed: {
            title: response.form.name,
            description: response.form.description,
            fields: questions.map((q, i) => {
                return {
                    name: q.value,
                    value: response.answers[i] || '*(answer skipped!)*'
                }
            }),
            color: parseInt(response.form.color || 'ee8833', 16),
            footer: {text: 'Awaiting acceptance/denial...'}
        }});

        var respembed = {embed: {
            title: "Response received!",
            description: [
                `Form name: ${response.form.name}`,
                `Form ID: ${response.form.hid}`,
                `User: ${user}`
            ].join('\n'),
            color: parseInt('ccaa00', 16),
            fields: [],
            timestamp: new Date().toISOString(),
            footer: {text: 'Awaiting acceptance/denial...'}
        }};

        for(var i = 0; i < questions.length; i++) {
            respembed.embed.fields.push({
                name: questions[i].value,
                value: response.answers[i] || "*(answer skipped!)*"
            })
        }

        try {
            var code = this.bot.utils.genCode(this.bot.chars);
            var created = await this.bot.stores.responses.create(response.server_id, code, {
                user_id: user.id,
                form: response.form.hid,
                questions: JSON.stringify(response.form.questions),
                answers: response.answers[0] ? response.answers :
                         new Array(questions.length).fill("*(answer skipped!)*"),
                status: 'pending'
            });
            this.bot.emit('SUBMIT', created);
            respembed.embed.description += `\nResponse ID: ${code}`;
            var guild = this.bot.guilds.resolve(response.server_id);
            if(!guild) return Promise.reject("ERR! Guild not found! Aborting!");
            var chan_id = response.form.channel_id || config?.response_channel;
            var channel = guild.channels.resolve(chan_id);
            if(!channel) return Promise.reject("ERR! Guild response channel missing! Aborting!");
            var rmsg = await channel.send(respembed);
            ['✅','❌'].forEach(r => rmsg.react(r));
            await this.bot.stores.responsePosts.create(rmsg.guild.id, channel.id, rmsg.id, {
                response: code
            })
            await this.bot.stores.forms.updateCount(rmsg.guild.id, response.form.hid);
        } catch(e) {
            console.log(e.message || e);
            return Promise.reject('ERR! '+(e.message || e));
        }

        await this.delete(response.channel_id);
        return Promise.resolve([
            'Response sent! Response ID: '+code,
            'Use this code to make sure your response has been received'
        ].join('\n'))
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
            await this.delete(response.channel_id);
            await prompt.edit({embed: {
                title: "Response cancelled",
                description: "This form response has been cancelled!",
                color: parseInt('aa5555', 16),
                timestamp: new Date().toISOString()
            }});
        } catch(e) {
            console.log(e);
            return Promise.reject('ERR! '+(e.message || e));
        }

        delete menus[message.channel.id];
        return Promise.resolve('Response cancelled!');
    }

    async skipQuestion(response, message, user, config) {
    	var questions = response.questions?.[0] ? response.questions : response.form.questions;
    	if(questions.length < response.answers.length + 1) return Promise.resolve();

        if(questions[response.answers.length].required)
            return Promise.resolve('This question can\'t be skipped!');

        var msg = await message.channel.send([
            'Are you sure you want to skip this question? ',
            "You can't go back to answer it!"
        ].join(""));
        ['✅','❌'].forEach(r => msg.react(r));

        var confirm = await this.bot.utils.getConfirmation(this.bot, message, user);
        if(confirm.msg) return Promise.resolve(confirm.msg);

        response.answers.push('*(answer skipped)*');
    	var msg = await this.sendQuestion(response, message);
    	await this.update(message.channel.id, {message_id: msg.id, answers: response.answers});

    	return;
    }

    async handleReactions(reaction, user) {
        if(this.bot.user.id == user.id) return;
        if(user.bot) return;

        var msg;
        if(reaction.message.partial) msg = await reaction.message.fetch();
        else msg = reaction.message;

        if(menus[msg.channel.id]) {
            return;
        }

        var response = await this.getByMessage(msg.channel.id, msg.id);
        if(!response) return;

        var questions = response.questions?.[0] ? response.questions : response.form.questions;
        if(!questions?.[0]) {
            await this.delete(msg.channel.id);
            return msg.channel.send("That form is invalid! This response is now closed");
        }

        var question = questions[response.answers.length]; // current question

        var config = await this.bot.stores.configs.get(response.server_id);

        switch(reaction.emoji.name) {
            case '✅':
                menus.push(msg.channel.id);
                try {
                    var res = await this.sendResponse(response, msg, user, config);
                } catch(e) {
                    await msg.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                await msg.channel.send(res);
                return;
            case '❌':
                menus.push(msg.channel.id);
                try {
                    var res = await this.cancelResponse(response, msg, user, config);
                } catch(e) {
                    await msg.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                await msg.channel.send(res);
                return;
            case '➡️':
                menus.push(msg.channel.id);
                try {
                    var res = await this.skipQuestion(response, msg, user, config);
                } catch(e) {
                    await msg.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == msg.channel.id), 1);
                if(res) await msg.channel.send(res);
                return;
        }

        var type = TYPES[question.type];
        if(!type.handleReactAdd) return;

        var res2 = await type.handleReactAdd(msg, response, question, reaction);
        if(!res2) return;
        response = res2.response;

        if(res2.menu) menus.push(msg.channel.id);

        var message;
        if(res2.send) var message = await this.sendQuestion(response, msg);

        await this.update(msg.channel.id, {
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

        if(menus[msg.channel.id]) {
            return;
        }

        var response = await this.getByMessage(msg.channel.id, msg.id);
        if(!response) return;

        var questions = response.questions?.[0] ? response.questions : response.form.questions;
        if(!questions?.[0]) {
            await this.delete(msg.channel.id);
            return msg.channel.send("That form is invalid! This response is now closed");
        }

        var question = questions[response.answers.length]; // current question
        if(!question) return;
        var type = TYPES[question.type];
        if(!type.handleReactRemove) return;

        var res = await type.handleReactRemove(msg, response, question, reaction);
        if(!res) return;
        response = res.response;

        await this.update(msg.channel.id, {
            answers: response.answers,
            selection: response.selection
        });
    }

    async handleMessage(message) {
        if(this.bot.user.id == message.author.id) return;
        if(message.author.bot) return;
        if(message.content.toLowerCase().startsWith(this.bot.prefix)) return; //in case they're doing commands

        var response = await this.get(message.channel.id);
        if(!response) return;

        var questions = response.questions?.[0] ? response.questions : response.form.questions;
        if(!questions?.[0]) {
            await this.delete(message.channel.id);
            return message.channel.send("That form is invalid! This response is now closed");
        }
        var question = questions[response.answers.length];
        var type = TYPES[question.type];
        var config = await this.bot.stores.configs.get(response.server_id);

        if(menus.includes(message.channel.id)) {
        	if(!response.selection?.includes('OTHER')) return;
        	if(!question) return;

        	var prompt = await message.channel.messages.fetch(response.message_id);
        	var embed = prompt.embeds[0];

        	if(message.content.toLowerCase() == 'cancel') {
				embed.fields[embed.fields.length - 1].value = 'Enter a custom response (react with 🅾️ or type "other")';
        		await prompt.edit({embed});
        		response.selection = response.selection.filter(x => x != 'OTHER');
        		await this.update(message.channel.id, {selection: response.selection});
        		menus.splice(menus.findIndex(c => c == message.channel.id), 1);
        		return;
        	}

        	response.selection[response.selection.indexOf('OTHER')] = message.content;
        	embed.fields[embed.fields.length - 1].value = message.content;
        	await prompt.edit({embed});
        	menus.splice(menus.findIndex(c => c == message.channel.id), 1);

			var msg;
        	if(question.type == 'mc') {
        		response.answers.push(message.content);
        		msg = await this.sendQuestion(response, message);
        	}
        	await this.update(message.channel.id, {
        		message_id: msg?.id || response.message_id,
        		selection: response.selection,
				answers: response.answers
        	});
        	return;
        }

        switch(message.content.toLowerCase()) {
            case 'submit':
                menus.push(message.channel.id);
                try {
                    var res = await this.sendResponse(response, message, message.author, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                    await message.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                await message.channel.send(res);
                return;
                break;
            case 'cancel':
                menus.push(message.channel.id);
                try {
                    var res = await this.cancelResponse(response, message, message.author, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                    await message.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                await message.channel.send(res);
                return;
                break;
            case 'skip':
                menus.push(message.channel.id);
                try {
                    var res = await this.skipQuestion(response, message, message.author, config);
                } catch(e) {
                    menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                    await message.channel.send(e.message || e);
                }
                menus.splice(menus.findIndex(c => c == message.channel.id), 1);
                if(res) await message.channel.send(res);
                return;
                break;
        }

        if(questions.length < response.answers.length + 1) return;

        if(!type.handleMessage) return;

        var res2 = await type.handleMessage(message, response, question);
        if(!res2) return;
        response = res2.response;

        if(res2.menu) menus.push(message.channel.id);

        var msg;
        if(res2.send) var msg = await this.sendQuestion(response, message);

        await this.update(message.channel.id, {
            message_id: msg?.id || message.id,
            answers: response.answers,
            selection: response.selection
        });
    }
}

module.exports = (bot, db) => new OpenResponseStore(bot, db);
