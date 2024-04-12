module.exports = {
	description: 'requires the user to send an attachment of any type',
	text: "attachment required.",
	alias: ['attachment', 'attach', 'att'],
	async handleMessage(message, response) {
		if(message.attachments.size == 0) {
			await message.channel.send('Invalid response! Please add an attachment');
			return undefined;
		}
		response.answers.push(message.content);
		response.answers[response.answers.length - 1] += "\n\n**Attachments:**\n" + message.attachments.map(a => a.url).join("\n");
		return {response, send: true};
	}
}