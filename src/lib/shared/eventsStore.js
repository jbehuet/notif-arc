export class EventsStore {
    constructor(store, key = 'nouvelle_aquitaine_events.json') {
        this.store = store;
        this.key = key;
    }

    async get() {
        return await this.read();
    }

    async update(ts, events){
        return this.write({ savedAt: ts, savedAtEpoch: new Date().getTime(), ...events})
    }

    // --- internes ---
    async read() {
        return await this.store.get(this.key, { type: 'json' });
    }

    async write(list) {
        await this.store.set(this.key, JSON.stringify(list, null, 2));
    }
}