export class SubscribersStore {
    constructor(store, key = 'subscribers.json') {
        this.store = store;
        this.key = key;
    }

    async list() {
        return await this.read();
    }

    async get(email) {
        const list = await this.read();
        return list.find(s => s.email === email);
    }

    async getByToken(token) {
        const list = await this.read();
        return list.find(s => s.token === token);
    }

    async createOrUpdate(subscriber){
        const list = await this.read();
        return this.write([...list.filter(r => r.email !== subscriber.email), subscriber])
    }

    async delete(email){
        const list = await this.read();
        return this.write([...list.filter(r => r.email !== email)])
    }

    // --- internes ---
    async read() {
        return await this.store.get(this.key, { type: 'json' });
    }

    async write(list) {
        await this.store.set(this.key, JSON.stringify(list, null, 2));
    }
}