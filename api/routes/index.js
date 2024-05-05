const FormRoutes = require('./forms');

class Routes {
	constructor(app, stores, manager) {
		this.app = app;
		this.stores = stores;
		this.manager = manager;

		this.forms = new FormRoutes(app, stores, manager);
		this.forms.init();
	}
}

module.exports = (app, stores, manager) => new Routes(app, stores, manager);