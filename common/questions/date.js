module.exports = {
	description: 'requires the user to enter only a date',
	text: "valid date required.",
	alias: ['date', 'dt'],

	embed(data) {
		return [{
			type: 10,
			content: '-# Requires a date'
		}];
	},

	async handle({ prompt, response, data }) {
		var date = new Date(data);
		if(isNaN(date)) {
			await prompt.channel.send("Invalid response! Please send a valid date");
			return undefined;
		}

		var answer = `<t:${Math.floor(date.getTime() / 1000)}:D>`
		var embed = prompt.components[0].toJSON();
		embed.components[embed.components.length - 1] = {
			type: 10,
			content: answer
		}

		response.answers.push(answer);
		return {response, send: true, embed};
	}
}