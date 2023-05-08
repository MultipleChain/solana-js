const utils = require('@multiplechain/utils');

Number.prototype.countDecimals = function () {
    if(Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0; 
}

module.exports = Object.assign(utils, {
    rejectMessage(error, reject) {
        if (typeof error == 'object') {
            if (
                ['WalletConnectionError', 'WalletWindowClosedError', 'WalletAccountError'].includes(error.name) ||
                error.code == 4001 || error.message == 'User rejected the request.' ||
                error.name == 'WalletSignTransactionError'
            ) {
                return reject('request-rejected');
            } else if ('WalletSendTransactionError' == error.name) {
                console.log('giri')
                return reject('not-accepted-chain');
            } else if (error.name == 'WalletTimeoutError') {
                return reject('timeout');
            } else if (error.name == "WalletNotReadyError") {
                reject('wallet-not-found');
            }
        }

        return reject(error);
    }
})