class ClientNotInitializedError extends Error {
    constructor() {
        super();
        Object.setPrototypeOf(this, ClientNotInitializedError.prototype);
    }
}

module.exports = {
    ClientNotInitializedError
} 