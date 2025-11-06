export class LogsStore {
    constructor(store, key) {
        this.store = store;
        this.key = key;
    }

    async read() {
        return await this.store.get(this.key, { type: 'json' });
    }

    async write(log) {
        await this.store.set(this.key, JSON.stringify(log, null, 2));
    }
}