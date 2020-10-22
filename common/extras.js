module.exports = {
	qTypes: [
		{type: 'mc', description: 'allows the user to choose one option from multiple choices', alias: ['multiple choice', 'multi', 'mc']},
		{type: 'cb', description: 'allows the user to choose several options from multiple choices', alias: ['checkbox', 'check', 'cb']},
		{type: 'text', description: 'allows the user to freely type an answer', alias: ['text', 'free']},
		{type: 'num', description: 'requires the user to enter only numbers', alias: ['number', 'numbers', 'num']},
		{type: 'dt', description: 'requires the user to enter only a date', alias: ['date', 'dt']},
		// {type: 'fm', description: 'requires the user to enter text following a specific format', alias: ['format', 'formatted', 'fm', 'custom']}
	],
	options: [
		{val: 'name', desc: 'copy name for this form', alias: ['n', 'name']},
		{val: 'description', desc: 'copy description for this form', alias: ['d', 'desc', 'description']},
		{val: 'roles', desc: 'copy roles for this form', alias: ['r', 'rls', 'rs', 'roles']},
		{val: 'channel_id', desc: 'copy response channel for this form', alias: ['ch', 'chan', 'channel']},
		{val: 'message', desc: 'copy acceptance message for this form', alias: ['m', 'msg', 'message']},
		{val: 'color', desc: 'copy color for this form', alias: ['c', 'col', 'color', 'colour']}
	],
	confirmReacts: ['✅','❌'],
	confirmVals: [['y', 'yes', '✅'], ['n', 'no', '❌']],
	numbers: ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"]
}
