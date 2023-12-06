
const Web3 = require('@solana/web3.js');
const Coin = require('./entity/coin');
const Token = require('./entity/token');
const SplToken = require('@solana/spl-token');
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
        devnet: {
            node: "devnet",
            name: "Devnet",
            host: "https://api.devnet.solana.com",
            wsUrl: "wss://floral-clean-spree.solana-devnet.quiknode.pro/29d39a45cef16b3aae880c79b568619f4728d388/",
            explorer: "https://solscan.io/"
        },
        testnet: {
            node: "testnet",
            name: "Testnet",
            host: "https://api.testnet.solana.com",
            explorer: "https://solscan.io/"
        }
    }

    /**
     * @var {Object}
     */
    network = {};

    /**
     * @var {String}
     */
    wcProjectId = null;

    /**
     * @var {Boolean}
     */
    qrPayments = false;

    /**
     * @var {Object}
     */
    supportedWallets;

    /**
     * @var {Object}
     */
    connectedWallet;

    allowedMethods = [
        'getAccountInfo', 'getBalance', 'getBlock', 'getBlockHeight', 'getBlockProduction', 'getBlockCommitment', 'getBlocks', 'getBlocksWithLimit', 'getBlockTime', 'getClusterNodes', 'getEpochInfo', 'getEpochSchedule', 'getFeeForMessage', 'getFirstAvailableBlock', 'getGenesisHash', 'getHealth', 'getHighestSnapshotSlot', 'getIdentity', 'getInflationGovernor', 'getInflationRate', 'getInflationReward', 'getLargestAccounts', 'getLatestBlockhash', 'getLeaderSchedule', 'getMaxRetransmitSlot', 'getMaxShredInsertSlot', 'getMinimumBalanceForRentExemption', 'getMultipleAccounts', 'getProgramAccounts', 'getRecentPerformanceSamples', 'getSignaturesForAddress', 'getSignatureStatuses', 'getSlot', 'getSlotLeader', 'getSlotLeaders', 'getStakeActivation', 'getSupply', 'getTokenAccountBalance', 'getTokenAccountsByDelegate', 'getTokenAccountsByOwner', 'getTokenLargestAccounts', 'getTokenSupply', 'getTransaction', 'getTransactionCount', 'getVersion', 'getVoteAccounts', 'isBlockhashValid', 'minimumLedgerSlot', 'requestAirdrop', 'sendTransaction', 'simulateTransaction', 'accountSubscribe', 'accountUnsubscribe', 'logsSubscribe', 'logsUnsubscribe', 'programSubscribe', 'programUnsubscribe', 'signatureSubscribe', 'signatureUnsubscribe', 'slotSubscribe', 'slotUnsubscribe'
    ];

    /**
     * @param {Object} options
     */
    constructor(options) {
        this.testnet = options.testnet;
        this.wcProjectId = options.wcProjectId;

        this.network = this.networks[this.testnet ? 'devnet' : 'mainnet'];

        if (!this.testnet) {
            if (options.customRpc) {
                this.network.host = options.customRpc;
            }
            
            if (options.customRpc) {
                this.network.wsUrl = options.customWs;
            }
        }

        if (this.network.wsUrl) {
            this.qrPayments = true;
        }

        this.web3 = new Web3.Connection(this.network.host, {wsEndpoint: this.network.wsUrl});
    }

    /**
     * @param {Object} options 
     * @param {Function} callback
     * @returns {Object}
     */
    async listenTransactions(options, callback) {
        let subscriptionId;
        let receiver = options.receiver;
        let tokenAddress = options.tokenAddress;
        if (this.qrPayments) {
            let subscription = {
                unsubscribe: () => {
                    this.web3.removeOnLogsListener(subscriptionId);
                }
            }
            
            if (tokenAddress) {
                let token = new SplToken.Token(
                    this.web3,
                    new Web3.PublicKey(tokenAddress),
                    SplToken.TOKEN_PROGRAM_ID
                );
    
                let tokenPublicKey = new Web3.PublicKey(tokenAddress);
                let receiverPublicKey = new Web3.PublicKey(receiver);
                receiver = (await SplToken.Token.getAssociatedTokenAddress(
                    token.associatedProgramId,
                    token.programId,
                    tokenPublicKey,
                    receiverPublicKey
                )).toBase58();
            }

            subscriptionId = this.web3.onLogs(new Web3.PublicKey(receiver), (logs, context) => {
                callback(subscription, this.Transaction(logs.signature));
            }, "confirmed");

            return subscription;
        } else {
            throw new Error('Websocket provider is not defined');
        }
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
            let detectedWallets = this.getDetectedWallets();
            if (detectedWallets[adapter]) {
                let wallet = detectedWallets[adapter];
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
     * @param {Array|null} filter 
     * @returns {Array}
     */
    getSupportedWallets(filter) {
        if (!this.supportedWallets) {
            const Wallet = require('./wallet');

            this.supportedWallets = {
                phantom: new Wallet('phantom', this),
                solflare: new Wallet('solflare', this),
                slope: new Wallet('slope', this),
                trustwallet: new Wallet('trustwallet', this),
                coinbasewallet: new Wallet('coinbasewallet', this),
                bitget: new Wallet('bitget', this),
                tokenpocket: new Wallet('tokenpocket', this),
                torus: new Wallet('torus', this),
            };
            
            if (this.wcProjectId) {
                this.supportedWallets['walletconnect'] = new Wallet('walletconnect', this);
            }
        }
        
        return Object.fromEntries(Object.entries(this.supportedWallets).filter(([key]) => {
            return !filter ? true : filter.includes(key);
        }));
    }

    /**
     * @param {Array|null} filter 
     * @returns {Array}
     */
    getDetectedWallets(filter) {
        let detectedWallets = this.getSupportedWallets(filter);
        return Object.fromEntries(Object.entries(detectedWallets).filter(([key, value]) => {
            return value.isDetected() == undefined ? true : value.isDetected()
        }));
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