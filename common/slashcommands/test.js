module.exports = {
	name: 'test',
	description: 'Testing slash commands',
	execute: async (ctx) => {
		return 'beep';
	},
	ephemeral: true
}