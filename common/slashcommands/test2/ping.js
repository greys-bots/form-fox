module.exports = {
	name: "ping",
	description: "ping",
	async execute(ctx) {
		return "pong!"
	},
	ephemeral: true
}