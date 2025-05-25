require('dotenv').config();

const {
	GatewayIntentBits: Intents,
} = require("discord.js");

const {
	Handlers,
	FrameClient
} = require('frame');

const bot = new FrameClient({
	intents: [
		Intents.Guilds,
		Intents.GuildMessages,
		Intents.GuildMessageReactions,
		Intents.GuildMembers,
		Intents.DirectMessages,
		Intents.DirectMessageReactions
	],
});

async function setup() {
	var { db, stores } = await Handlers.DatabaseHandler(bot, __dirname + '/../common/stores');
	bot.db = db;
	bot.stores = stores;

	var forms = await bot.stores.forms.getEvery();

	for(var form of forms) {
		console.log(form.hid);
		if(!form.roles) continue;
		var keys = Object.keys(form.roles);
		if(!keys?.length) continue;

		for(var k of keys) {
			console.log(form.roles[k]);
			if(!form.roles[k]?.length) continue;
			var event = k;
			var add = [];
			var remove = [];

			for(var r of form.roles[k]) {
				if(r.action == 'add') add.push(r.id);
				if(r.action == 'remove') remove.push(r.id);
			}

			if(add.length) {
				await bot.stores.actions.create({
					server_id: form.server_id,
					form: form.hid,
					type: 'role:add',
					event,
					data: {
						roles: add,
						type: 'role:remove',
						event
					}
				})
			}

			if(remove.length) {
				await bot.stores.actions.create({
					server_id: form.server_id,
					form: form.hid,
					type: 'role:remove',
					event,
					data: {
						roles: remove,
						type: 'role:remove',
						event
					}
				})
			}
		}

		form.roles = {};
		await form.save(false);
	}
}

setup()
.then(() => process.exit(0))
.catch(e => { console.error(e); process.exit(1) })