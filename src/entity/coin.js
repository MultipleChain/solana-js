const utils = require('../utils');
const Web3 = require('@solana/web3.js');

class Coin {

    /**
     * @var {String} 
     */
    symbol;

    /**
     * @var {String} 
     */
    decimals;

    /**
     * @var {Provider} 
     */
    provider;

    /**
     * @param {Provider} provider 
     */
    constructor(provider) {
        this.provider = provider;
        this.decimals = 9;
        this.symbol = 'SOL';
    }

    /**
     * @returns {String}
     */
    getSymbol() {
        return this.symbol;
    }

    /**
     * @returns {Integer}
     */
    getDecimals() {
        return this.decimals;
    }

    /**
     * @param {String} address
     * @returns {Float}
     */
    async getBalance(address) {
        return utils.toDec((await this.provider.web3.getBalance(new Web3.PublicKey(address))), 9);
    }

    /**
     * @param {String} from
     * @param {String} to 
     * @param {Float|Integer} amount 
     * @returns {String|Object}
     */
    transfer(from, to, amount) {
        return new Promise(async (resolve, reject) => {
            try {

                if (parseFloat(amount) < 0) {
                    return reject('transfer-amount-error');
                }

                if (parseFloat(amount) > await this.getBalance(from)) {
                    return reject('insufficient-balance');
                }

                const fromPublicKey = new Web3.PublicKey(from);
                const toPublicKey = new Web3.PublicKey(to);
                amount = utils.toHex(amount, 9);

                return resolve(
                    this.provider.createTransaction(
                        Web3.SystemProgram.transfer({
                            fromPubkey: fromPublicKey,
                            toPubkey: toPublicKey,
                            lamports: amount,
                        })
                    ));
            } catch (error) {
                return reject(error);
            }
        });
    }
}

module.exports = Coin;