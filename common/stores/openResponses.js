const { Models: { DataStore, DataObject } } = require('frame');
const { numbers: NUMBERS } = require('../extras');
const TYPES = require('../questions');

var menus = [];
const KEYS = {
    id: { },
    server_id: { },
    channel_id: { },
    message_id: { patch: true },
    user_id: { },
    form: { },
    questions: { },
    answers: { patch: true },
    selection: { patch: true },
    page: { patch: true },
    data: { patch: true } // object combining questions, answers, selections, and page
}

/*

  data = {
    order: ['qid1', 'qid2'], // pulled from form
    questions: [
        {
            id: 'qid1',
            name: 'question 1',
            // ...
            answer: 'answer goes here'
        },
        // ...
    ],
    selection: ['selection data'],
    page: 1
  }

  data stores full questions to avoid having to cancel currently open responses when a form is edited
    eventually structure will be changed to account for sections
*/

class OpenResponse extends DataObject {
    constructor(store, keys, data) {
        super(store, keys, data);
    }

    nextQuestion() {
        var qs = this.data?.questions;
        if(!qs) return 'No questions to look through.';

        var question;
        for(var id in this.order) {
            var q = qs.find(x => x.id == id);
            if(!q || q?.answer?.length) continue;

            question = q;
            break;
        }

        return question;
    }
}

class OpenResponseStore extends DataStore {
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
        super(bot, db);
    }

    async init() {
    	await this.db.query(`CREATE TABLE IF NOT EXISTS open_responses (
			id 			SERIAL PRIMARY KEY,
			server_id 	TEXT,
			channel_id 	TEXT,
			message_id 	TEXT,
			user_id 	TEXT,
			form 		TEXT REFERENCES forms(hid) ON DELETE CASCADE,
			questions   JSONB,
			answers 	TEXT[],
			selection   TEXT[],
			page 		INTEGER,
            data        JSONB
		)`)
    }
    
    async create(data = {}) {
        try {
            var c = await this.db.query(`INSERT INTO open_responses (
                server_id,
                channel_id,
                message_id,
                user_id,
                form,
                data
            ) VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING id`,
            [data.server_id, data.channel_id, data.message_id,
             data.user_id, data.form, data.data || {}]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        return await this.getID(c.rows[0].id);
    }

    async get(channel) {
        try {
            var data = await this.db.query(`SELECT * FROM open_responses WHERE channel_id = $1`,[channel]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        if(data.rows?.[0]) {
            var response = new OpenResponse(this, KEYS, data.rows[0])
            var form = await this.bot.stores.forms.get(response.server_id, response.form);
            if(form?.id) response.form = form;
            return response;
        } else return new OpenResponse(this, KEYS, { channel_id: channel });
    }

    async getID(id) {
        try {
            var data = await this.db.query(`SELECT * FROM open_responses WHERE id = $1`,[id]);
        } catch(e) {
            console.log(e);
            return Promise.reject(e.message);
        }
        
        if(data.rows?.[0]) {
            var response = new OpenResponse(this, KEYS, data.rows[0])
            var form = await this.bot.stores.forms.get(response.server_id, response.form);
            if(form?.id) response.form = form;
            return response;
        } else return new OpenResponse(this, KEYS, { });
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