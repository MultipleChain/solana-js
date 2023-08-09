
const Web3 = require('@solana/web3.js');
const Coin = require('./entity/coin');
const Token = require('./entity/token');
const SplToken = require('@solana/spl-token');
const Transaction = require('./entity/transaction');

if (typeof window === 'undefined') {
    WebSocket = require('ws');
}

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
     * @var {String}
     */
    wsUrl;

    /**
     * @var {Boolean}
     */
    qrPayments = false;

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
     * @param {Object} options
     */
    constructor(options) {
        this.testnet = options.testnet;

        this.network = this.networks[this.testnet ? 'devnet' : 'mainnet'];
        if (!this.testnet && options.customRpc) {
            this.network.host = options.customRpc;
        }

        if (!this.testnet && options.customWs) {
            this.wsUrl = options.customWs;
        }

        if (this.wsUrl) {
            this.qrPayments = true;
        }

        this.web3 = new Web3.Connection(this.network.host);

        this.detectWallets();
    }

    /**
     * @param {Object} options 
     * @param {Function} callback
     */
    async listenTransactions(options, callback) {
        let subscriptionId;
        let receiver = options.receiver;
        let tokenAddress = options.tokenAddress;
        if (this.wsUrl) {
            let ws = new WebSocket(this.wsUrl);
            let subscription = {
                unsubscribe: () => {
                    ws.send(
                        JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'logsUnsubscribe',
                            params: [subscriptionId],
                        })
                    );
                    ws.close();
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

            ws.addEventListener('open', () => {
                ws.send(
                    JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'logsSubscribe',
                        params: [
                            {
                                mentions: [receiver],
                            },
                        ],
                    })
                );
            });

            ws.addEventListener('message', (res) => {
                let data = JSON.parse(res.data);
                
                if (typeof data.result == 'number') {
                    subscriptionId = data.result;
                }

                if (data.method && data.method == 'logsNotification' && data.params) {
                    callback(subscription, this.Transaction(data.params.result.value.signature));
                }
            });
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
     * @param {Array|null} filter 
     * @returns {Array}
     */
    getSupportedWallets(filter) {
        
        const Wallet = require('./wallet');

        const wallets = {
            phantom: new Wallet('phantom', this),
            solflare: new Wallet('solflare', this),
            slope: new Wallet('slope', this),
        };

        return Object.fromEntries(Object.entries(wallets).filter(([key]) => {
            return !filter ? true : filter.includes(key);
        }));
    }

    /**
     * @param {Array|null} filter 
     * @returns {Array}
     */
    getDetectedWallets(filter) {
        return Object.fromEntries(Object.entries(this.detectedWallets).filter(([key]) => {
            return !filter ? true : filter.includes(key);
        }));
    }

    detectWallets() {
        if (typeof window != 'undefined') {
            const Wallet = require('./wallet');

            if (window.phantom?.solana?.isPhantom) {
                this.detectedWallets['phantom'] = new Wallet('phantom', this);
            }

            if (window.Slope) {
                this.detectedWallets['slope'] = new Wallet('slope', this);
            }

            if (window.solflare?.isSolflare) {
                this.detectedWallets['solflare'] = new Wallet('solflare', this);
            }
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