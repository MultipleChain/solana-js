const utils = require('@multiplechain/utils');

Number.prototype.countDecimals = function () {
    if(Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0; 
}

module.exports = Object.assign(utils, {
    rejectMessage(error, reject) {
        if (typeof error == 'object') {

            
            if (error.message.includes('QR Code Modal Closed')) {
                return reject('closed-walletconnect-modal')
            }

            if (error.name == 'WalletSendTransactionError') {
                if (
                    String(error.message).indexOf('Unexpected error') > -1 ||
                    String(error.message).indexOf('Transaction simulation failed: Blockhash not found') > -1  ||
                    String(error.message).indexOf('Transaction results in an account (1) without insufficient funds for rent') > -1 
                ) {
                    return reject(error);
                }
            }

            if (
                ['WalletConnectionError', 'WalletWindowClosedError', 'WalletAccountError', 'WalletSendTransactionError'].includes(error.name) ||
                error.code == 4001 || error.message == 'User rejected the request.' ||
                error.name == 'WalletSignTransactionError' || String(error.message).indexOf('user reject this request') > -1 || error.message == 'User canceled request'
            ) {
                return reject('request-rejected');
            } else if (error.name == 'WalletTimeoutError') {
                return reject('timeout');
            } else if (
                (error.message && error.message.indexOf('403') !== -1) ||
                (error.message && error.message.indexOf('Access forbidden') !== -1)
            ) {
                return reject('rpc-access-forbidden');
            } else if (error.name == "WalletNotReadyError") {
                return reject('wallet-not-found');
            } else if ((error.name == 'WalletSendTransactionError' && (error.message != 'User rejected the request.' || error.message != 'User canceled request')) || error.message == 'User disapproved requested chains') {
                return reject('not-accepted-chain');
            } 
        }

        return reject(error);
    }
})