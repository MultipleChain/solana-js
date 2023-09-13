class ClientNotInitializedError extends Error {
    constructor() {
        super();
        Object.setPrototypeOf(this, ClientNotInitializedError.prototype);
    }
}

class QRCodeModalError extends Error {
    constructor() {
        super();
        Object.setPrototypeOf(this, QRCodeModalError.prototype);
    }
}

module.exports = {
    QRCodeModalError,
    ClientNotInitializedError
} 