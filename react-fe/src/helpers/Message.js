export default class Message {
    static lastId = 0;
    constructor(content, className) {
        this.id = ++Message.lastId;
        this.content = content;
        this.className = className || "alert-info";
    }
};