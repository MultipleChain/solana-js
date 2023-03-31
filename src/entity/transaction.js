const utils = require('../utils');

class Transaction {

    /**
     * @var {String} 
     */
    hash;

    /**
     * @var {Object} 
     */
    data;

    /**
     * @var {Object}
     */
    provider;

    /**
     * @var {Number}
     */
    timer = 0;
    
    /**
     * @param {String} hash 
     * @param {Provider} provider
     */
    constructor(hash, provider) {
        this.hash = hash;
        this.provider = provider;
    }

    /**
     * @returns {String}
     */
    getHash() {
        return this.hash;
    }

    /**
     * @param {Number} timer 
     */
    setTimer(timer) {
        this.timer = timer;
    }
    
    /**
     * @returns {Object}
     */
    async getData() {
        try {
            return this.data = await this.provider.request('getTransaction', [this.hash]);
        } catch (error) {
            throw new Error('data-request-failed');
        }
    }

    /**
     * @param {Number} timer 
     * @returns {Boolean}
     */
    async validate() {
        let data = await this.getData();
        if (data === null) {
            await this.provider.confirmTransaction(this.hash);
            data = await this.getData();
        }

        if (data.meta && data.meta.err === null) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @param {Number} amount 
     * @returns {Boolean}
     */
    async verifyTokenTransferWithData(amount) {
        if (await this.validate()) {
            let beforeBalance, afterBalance, diff;
            beforeBalance = this.data.meta.preTokenBalances[0].uiTokenAmount.uiAmount;
            afterBalance = this.data.meta.postTokenBalances[0].uiTokenAmount.uiAmount;
            diff = (beforeBalance - afterBalance);

            if (!(diff == amount)) {
                beforeBalance = this.data.meta.preTokenBalances[1].uiTokenAmount.uiAmount;
                afterBalance = this.data.meta.postTokenBalances[1].uiTokenAmount.uiAmount;
                diff = (beforeBalance - afterBalance);
            }

            if (!(diff == amount)) {
                diff = Math.abs(beforeBalance - afterBalance).toFixed(amount.countDecimals());
            }
            
            return String(diff) == String(amount);
        } else {
            return false;
        }
    }

    /**
     * @param {Number} amount 
     * @returns {Boolean}
     */
    async verifyCoinTransferWithData(amount) {
        if (await this.validate()) {
            let beforeBalance, afterBalance, diff;
            beforeBalance = this.data.meta.preBalances[0];
            afterBalance = this.data.meta.postBalances[0];
            diff = utils.toDec((afterBalance - beforeBalance), 9);
            
            if (!(diff == amount)) {
                beforeBalance = this.data.meta.preBalances[1];
                afterBalance = this.data.meta.postBalances[1];
                diff = utils.toDec((afterBalance - beforeBalance), 9);
            }
        
            return diff == amount;
        } else {
            return false;
        }
    }

    /**
     * @param {Object} config 
     * @returns 
     */
    async verifyTransferWithData(config) {
        
        if (config.tokenAddress) {
            return this.verifyTokenTransferWithData(config.amount);
        } else {
            return this.verifyCoinTransferWithData(config.amount);
        }
    }

    /**
     * @returns {String}
     */
    getUrl() {
        let node = this.provider.network.node;
        let transactionUrl = this.provider.network.explorer + "tx/" + this.hash;
        transactionUrl += node != 'mainnet-beta' ? '?cluster=' + node : '';
        return transactionUrl;
    }

}

module.exports = Transaction;