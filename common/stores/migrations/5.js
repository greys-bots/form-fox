// changes form roles to jsonb

module.exports = async (bot, db) => {
	var version = (await db.query(`SELECT * FROM extras WHERE key = 'version'`)).rows[0]?.val;
	var data = await db.query(`SELECT server_id, hid, roles FROM forms`);
	data = data.rows;

	await db.query(`
		UPDATE forms SET roles = NULL;
		ALTER TABLE forms ALTER COLUMN roles TYPE JSONB USING to_jsonb(roles);
	`);

	for(var d of data) {
		var roles;
		if(d.roles?.length) roles = d.roles.map(r => ({id: r, events: ['ACCEPT']}));
		else roles = [];
		await db.query(`UPDATE forms SET roles = $3 WHERE server_id = $1 AND hid = $2`, [d.server_id, d.hid, JSON.stringify(roles)])
	}

	return;
}