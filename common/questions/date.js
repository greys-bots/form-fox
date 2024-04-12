module.exports = {
	description: 'requires the user to enter only a date',
	text: "valid date required.",
	alias: ['date', 'dt'],
	async handleMessage(message, response) {
		var date = new Date(message.content);
		if(isNaN(date)) {
			await message.channel.send("Invalid response! Please send a valid date");
			return undefined;
		}

		response.answers.push(`<t:${Math.floor(date.getTime() / 1000)}:D>`);
		return {response, send: true};
	}
}