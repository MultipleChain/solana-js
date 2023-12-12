const utils = require('@multiplechain/utils');
const BigNumber = require('bignumber.js');

Number.prototype.countDecimals = function () {
    if(Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0; 
}

module.exports = Object.assign(utils, {
    supplyFormat(supply, decimals) {
        let length = '1' + '0'.repeat(decimals);
        let value = new BigNumber(supply.toString(10), 10).times(length);
        return value.toString(10);
    },
    async validateTokenMetaData(metaData) {
        if (!metaData.decimals) {
            throw new Error("Token decimals required!");
        }

        if (!metaData.supply) {
            throw new Error("Token supply required!");
        }

        if (!metaData.symbol) {
            throw new Error("Token symbol required!");
        }

        if (!metaData.name) {
            throw new Error("Token name require!");
        }

        if (metaData.supply <= 0) {
            throw new Error("Token supply must be greater than 0!");
        }

        if (metaData.decimals <= 0) {
            throw new Error("Token decimals must be greater than 0!");
        }

        if (metaData.symbol.length < 2 || metaData.symbol.length > 5) {
            throw new Error("Token symbol length must be between 2 and 5 characters!");
        }

        let jsonData = await fetch(metaData.uri)
        .then(response => response.json())
        .catch((error) => {
            console.log(error)
            throw new Error("Token uri have json problem!");
        });

        if (!jsonData.image) {
            throw new Error("Token image required!");
        }

        if (!jsonData.description) {
            throw new Error("Token description required!");
        }

        if (!jsonData.name || jsonData.name != metaData.name) {
            throw new Error("Token name not same with uri!");
        }

        if (!jsonData.symbol || jsonData.symbol != metaData.symbol) {
            throw new Error("Token symbol not same with uri!");
        }
    },
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