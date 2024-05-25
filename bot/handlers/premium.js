class PremiumHandler {
	bot;
	
	constructor(bot) {
		this.bot = bot;

		this.bot.on('entitlementCreate', (evt) => this.handleCreate(evt));
		this.bot.on('entitlementDelete', (evt) => this.handleDelete(evt));
		this.bot.on('entitlementUpdate', (ont, nnt) => this.handleUpdate(ont, nnt));
	}

	async checkAccess(guild) {
		var prem = await this.bot.stores.premium.getAll(guild);
		var ents = await this.bot.application.entitlements.fetch({ guild });
		var skus = await this.bot.application.fetchSKUs();
		
		ents = ents.map(x => {
			return {
				sku: x.skuId,
				entitlement: x.id,
				perks: skus.find(s => s.id == x.skuId)?.name,
				ends_at: x.endsAt,
			}
		});

		if(!prem.length && !ents.length) {
			return { access: false, error: 'none' }
		}

		var total = [...prem, ...ents];
		console.log(total)
		if(!total.find(x => !x.ends_at || (x.ends_at && x.ends_at.getTime() > Date.now())))
			return { access: false, error: 'expired' }

		if(total.length > prem.length) {
			for(var ent of ents) {
				var exists = prem.find(x => {
					return (
						ent.id == prem.id
					)
				})
				if(exists) continue;

				await this.bot.stores.premium.create({
					guild_id: guild,
					...ent
				})
			}
		}

		var text = total.map(x => {
			return (
				`${x.perks} - ends: ` +
				(x.ends_at ? `<t:${x.ends_at.getTime()}:f>` : "never")
			)
		}).join("\n")

		return { access: true, entitlements: ents, text }
	}

	async handleCreate(event) {
		var skus = await this.bot.application.fetchSKUs();

		await this.bot.stores.premium.create({
			guild_id: event.guildId,
			sku: event.skuId,
			entitlement: event.id,
			perks: skus.find(x => x.id == event.skuId)?.name,
			ends_at: event.endsAt
		})
	}

	async handleDelete(event) {
		var ent = await this.bot.stores.premium.getByEntitlement(event.id);
		if(!ent?.id) return;
		await ent.delete();
	}

	async handleUpdate(oldEnt, newEnt) {
		var skus = await this.bot.application.fetchSKUs();

		var ent = await this.bot.stores.premium.getByEntitlement(oldEnt.id);
		if(!ent?.id) return;

		var update = {
			sku: newEnt.skuId,
			entitlement: newEnt.id,
			perks: skus.find(x => x.id == newEnt.skuId)?.name,
			ends_at: newEnt.endsAt
		}

		for(var k in update) {
			ent[k] = update[k]
		}

		await ent.save();
	}
}

module.exports = (bot) => new PremiumHandler(bot)