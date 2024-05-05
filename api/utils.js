module.exports = {
	auth: (req, res, next) => {
		// var token = req.headers['authorization'];
		// if(!token || token !== process.env.TOKEN)
		// 	return res.status(401).send();

		var user = req.headers['x-discord-user'];
		if(!user?.length) return res.status(400).send();

		req.user = user;
		return next();
	}
}