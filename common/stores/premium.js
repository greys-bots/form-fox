const { Models: { DataObject, DataStore }} = require('frame');

const KEYS = {
	id: { },
	hid: { },
	guild_id: { },
	sku: { patch: true },
	entitlement: { patch: true },
	perks: { patch: true },
	ends_at: { patch: true }
}

class Premium extends DataObject {
	constructor(store, keys, data) {
		super(store, keys, data);
	}
}

class PremiumStore extends DataStore {
	constructor(bot, db) {
		super(bot, db);
	};

	async init() {
		await this.db.query(`
			CREATE TABLE IF NOT EXISTS premium (
				id 				SERIAL PRIMARY KEY,
				hid 			TEXT,
				guild_id 		TEXT,
				sku 			TEXT,
				entitlement 	TEXT,
				perks 			TEXT,
				ends_at 		TIMESTAMPTZ
			);
		`)
	}

	async create(data = {}) {
		try {
			var c = await this.db.query(`INSERT INTO premium (
				hid,
				guild_id,
				sku,
				entitlement,
				perks,
				ends_at
			) VALUES (find_unique('premium'), $1,$2,$3,$4,$5)
			RETURNING id`,
			[data.guild_id, data.sku, data.entitlement, data.perks, data.ends_at])
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return await this.getID(c.rows[0].id);
	}

	async index(data = {}) {
		try {
			await this.db.query(`INSERT INTO premium (
				hid,
				guild_id,
				sku,
				entitlement,
				perks,
				ends_at
			) VALUES (find_unique('premium'), $1,$2,$3,$4,$5)
			RETURNING id`,
			[data.guild_id, data.sku, data.entitlement, data.perks, data.ends_at])
		} catch(e) {
			console.log(e);
	 		return Promise.reject(e.message);
		}
		
		return;
	}

	async getID(id) {
		try {
			var data = await this.db.query(`SELECT * FROM premium WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows && data.rows[0]) {
			return new Premium(this, KEYS, data.rows[0]);
		} else return new Premium(this, KEYS, { });
	}

	async get(hid) {
		try {
			var data = await this.db.query(`SELECT * FROM premium WHERE hid = $1`,[hid]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows && data.rows[0]) {
			return new Premium(this, KEYS, data.rows[0]);
		} else return new Premium(this, KEYS, { guild_id: guild });
	}

	async getByEntitlement(id) {
		try {
			var data = await this.db.query(`SELECT * FROM premium WHERE entitlement = $1`,[id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows && data.rows[0]) {
			return new Premium(this, KEYS, data.rows[0]);
		} else return new Premium(this, KEYS, { entitlement: id });
	}

	async getAll(guild) {
		try {
			var data = await this.db.query(`SELECT * FROM premium WHERE guild_id = $1`,[guild]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		if(data.rows && data.rows[0]) {
			return data.rows.map(x => new Premium(this, KEYS, x));
		} else return [];
	}

	async update(id, data = {}) {
		try {
			await this.db.query(`UPDATE premium SET ${Object.keys(data).map((k, i) => k+"=$"+(i+2)).join(",")} WHERE id = $1`,[id, ...Object.values(data)]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}

		return await this.getID(id);
	}

	async delete(id) {
		try {
			await this.db.query(`DELETE FROM premium WHERE id = $1`, [id]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}

	async deleteAll(guild) {
		try {
			await this.db.query(`DELETE FROM premium WHERE guild_id = $1`, [guild]);
		} catch(e) {
			console.log(e);
			return Promise.reject(e.message);
		}
		
		return;
	}
}

module.exports = (bot, db) => new PremiumStore(bot, db);