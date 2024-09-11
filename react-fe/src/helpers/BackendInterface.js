export default class BackendInterface {
    async getFile(key) {
        const res = await fetch(`/api/file?key=${key}`);
        const json = await res.json();
        return json;
    }
};