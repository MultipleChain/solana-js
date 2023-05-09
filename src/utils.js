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
                return reject('not-accepted-chain');
            } else if (error.name == 'WalletTimeoutError') {
                return reject('timeout');
            } else if (
                (error.message && error.message.indexOf('403') !== -1) ||
                (error.message && error.message.indexOf('Access forbidden') !== -1)
            ) {
                return reject('rpc-access-forbidden');
            } else if (error.name == "WalletNotReadyError") {
                return reject('wallet-not-found');
            }
        }

        return reject(error);
    }
})