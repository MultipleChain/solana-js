
const utils = require('./utils');
const Web3 = require('@solana/web3.js');
const Coin = require('./entity/coin');
const Token = require('./entity/token');
const Transaction = require('./entity/transaction');

class Provider {

    /**
     * @var {Object}
     */
    web3;

    /**
     * @var {Boolean}
     */
    testnet = false;

    /**
     * @var {Object}
     */
    networks = {
        mainnet: {
            node: "mainnet-beta",
            name: "Mainnet",
            host: "https://api.mainnet-beta.solana.com/",
            explorer: "https://solscan.io/"
        },
        testnet: {
            node: "testnet",
            name: "Testnet",
            host: "https://api.testnet.solana.com",
            explorer: "https://solscan.io/"
        },
        devnet: {
            node: "devnet",
            name: "Devnet",
            host: "https://api.devnet.solana.com",
            explorer: "https://solscan.io/"
        }
    }

    /**
     * @var {Object}
     */
    network = {};

    /**
     * @var {Object}
     */
    detectedWallets = [];

    /**
     * @var {Object}
     */
    connectedWallet;

    allowedMethods = [
        'getAccountInfo', 'getBalance', 'getBlock', 'getBlockHeight', 'getBlockProduction', 'getBlockCommitment', 'getBlocks', 'getBlocksWithLimit', 'getBlockTime', 'getClusterNodes', 'getEpochInfo', 'getEpochSchedule', 'getFeeForMessage', 'getFirstAvailableBlock', 'getGenesisHash', 'getHealth', 'getHighestSnapshotSlot', 'getIdentity', 'getInflationGovernor', 'getInflationRate', 'getInflationReward', 'getLargestAccounts', 'getLatestBlockhash', 'getLeaderSchedule', 'getMaxRetransmitSlot', 'getMaxShredInsertSlot', 'getMinimumBalanceForRentExemption', 'getMultipleAccounts', 'getProgramAccounts', 'getRecentPerformanceSamples', 'getSignaturesForAddress', 'getSignatureStatuses', 'getSlot', 'getSlotLeader', 'getSlotLeaders', 'getStakeActivation', 'getSupply', 'getTokenAccountBalance', 'getTokenAccountsByDelegate', 'getTokenAccountsByOwner', 'getTokenLargestAccounts', 'getTokenSupply', 'getTransaction', 'getTransactionCount', 'getVersion', 'getVoteAccounts', 'isBlockhashValid', 'minimumLedgerSlot', 'requestAirdrop', 'sendTransaction', 'simulateTransaction', 'accountSubscribe', 'accountUnsubscribe', 'logsSubscribe', 'logsUnsubscribe', 'programSubscribe', 'programUnsubscribe', 'signatureSubscribe', 'signatureUnsubscribe', 'slotSubscribe', 'slotUnsubscribe'
    ];

    /**
     * @param {Boolean} testnet 
     */
    constructor(testnet = false) {
        this.testnet = testnet;

        this.network = this.networks[this.testnet ? 'testnet' : 'mainnet'];

        this.web3 = new Web3.Connection(this.network.host);

        this.detectWallets();
    }

    /**
     * 
     * @param {String} method 
     * @param {Array} params 
     * @returns {Mixed}
     */
    async request(method, params) {
        if (!this.allowedMethods.includes(method)) {
            throw new Error('Unallowed method: ' . method);
        }
        
        let response = await fetch(this.network.host, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Math.floor(Math.random() * 1001),
                method: method,
                params: params
            })
        }).then(response => response.json());

        if (response.error) {
            throw new Error(response.error.message);
        }

        return response.result;
    }

    /**
     * @param {Wallet} wallet 
     */
    setConnectedWallet(wallet) {
        this.connectedWallet = wallet;
    }

    /**
     * @param {Object} instrucion 
     * @param {Object} txOptions 
     * @returns {object}
     */
    createTransaction(instrucion, txOptions = {}) {
        return new Web3.Transaction(txOptions).add(instrucion);
    }

    /**
     * @param {String} hash 
     * @param {String} commitment 
     * @returns 
     */
    confirmTransaction(hash, commitment = 'finalized') {
        return this.web3.confirmTransaction(hash, commitment);
    }

    /**
     * @param {String} adapter 
     * @returns {Promise}
     */
    connectWallet(adapter) {
        return new Promise(async (resolve, reject) => {
            if (this.detectedWallets[adapter]) {
                let wallet = this.detectedWallets[adapter];
                wallet.connect()
                .then(() => {
                    resolve(wallet);
                })
                .catch(error => {
                    reject(error);
                });
            } else {
                reject('wallet-not-found');
            }
        });
    }

    /**
     * @param {Array} filter 
     * @returns {Array}
     */
    getDetectedWallets(filter) {
        return Object.fromEntries(Object.entries(this.detectedWallets).filter(([key]) => {
            return filter.includes(key);
        }));
    }

    detectWallets() {
        if (typeof window != 'undefined') {
            const Wallet = require('./wallet');

            if (window.phantom) {
                this.detectedWallets['phantom'] = new Wallet('phantom', this);
            }
            

            if (window.Slope) {
                this.detectedWallets['slope'] = new Wallet('slope', this);
            }

            this.detectedWallets['solflare'] = new Wallet('slope', this);
        }
    }

    /**
     * @returns {Coin}
     */
    Coin() {
        return new Coin(this);
    }

    /**
     * @param {String} address 
     * @returns {Token}
     */
    Token(address) {
        return new Token(address, this);
    }

    /**
     * @param {String} hash 
     * @returns {Transaction}
     */
    Transaction(hash) {
        return new Transaction(hash, this);
    }
}

module.exports = Provider;