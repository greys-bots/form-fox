const { numbers: NUMBERS, qTypes: TYPES } = require('../extras');
var menus = [];
const KEYS = {
    id: { },
    server_id: { },
    channel_id: { },
    message_id: { patch: true },
    user_id: { },
    form: { },
    questions: { },
    answers: { patch: true }
}

class OpenResponse {
    #store;

    constructor(store, data) {
        this.#store = store;
        for(var k in KEYS) this[k] = data[k];
    }

    async fetch() {
        var data = await this.#store.getID(this.id);
        for(var k in KEYS) this[k] = data[k];

        return this;
    }

    async save() {
        var obj = await this.verify();

        var data;
        if(this.id) data = await this.#store.update(this.id, obj);
        else data = await this.#store.create(this.server_id, this.channel_id, this.message_id, obj);
        for(var k in KEYS) this[k] = data[k];
        return this;
    }

    async delete() {
        await this.#store.delete(this.id);
    }

    async verify(patch = true /* generate patch-only object */) {
        var obj = {};
        var errors = []
        for(var k in KEYS) {
            if(!KEYS[k].patch && patch) continue;
            if(this[k] == undefined) continue;
            if(this[k] == null) {
                obj[k] = this[k];
                continue;
            }

            var test = true;
            if(KEYS[k].test) test = await KEYS[k].test(this[k]);
            if(!test) {
                errors.push(KEYS[k].err);
                continue;
            }
            if(KEYS[k].transform) obj[k] = KEYS[k].transform(this[k]);
            else obj[k] = this[k];
        }

        if(errors.length) throw new Error(errors.join("\n"));
        return obj;
    }
}

class OpenResponseStore {
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
        this.db = db;
        this.bot = bot;
    };
    
    async create(server, channel, message, data = {}) {
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
            return Promise.reject(e.message);
        }
        
        return await this.get(channel);
    }

    async index(server, channel, message, data = {}) {
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
            return Promise.reject(e.message);
        }
        
        return;
    }

    async get(channel) {
        try {
            var data = await this.db.query(`SELECT * FROM open_responses WHERE channel_id = $1`,[channel]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        if(data.rows?.[0]) {
            var response = new OpenResponse(this, data.rows[0])
            var form = await this.bot.stores.forms.get(response.server_id, response.form);
            if(form?.id) response.form = form;
            return response;
        } else return new OpenResponse(this, { channel_id: channel });
    }

    async getID(id) {
        try {
            var data = await this.db.query(`SELECT * FROM open_responses WHERE id = $1`,[id]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        if(data.rows?.[0]) {
            var response = new OpenResponse(this, data.rows[0])
            var form = await this.bot.stores.forms.get(response.server_id, response.form);
            if(form?.id) response.form = form;
            return response;
        } else return new OpenResponse(this, { });
    }

    async update(id, data = {}) {
        try {
            await this.db.query(`UPDATE open_responses SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }

        return await this.getID(id);
    }

    async delete(id) {
        try {
            await this.db.query(`DELETE FROM open_responses WHERE id = $1`, [id]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        return;
    }
}

module.exports = (bot, db) => new OpenResponseStore(bot, db);
