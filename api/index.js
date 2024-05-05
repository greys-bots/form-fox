require('dotenv').config();

const express = require('express');

const Routes = require('./routes');
const Manager = require('./modules/manager');

async function setup(bot, stores) {
	const app = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	const manager = Manager(bot);

	await Routes(app, stores, manager);

	return app;
}

module.exports = setup;