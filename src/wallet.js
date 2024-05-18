const utils = require('./utils');
const Web3 = require('@solana/web3.js');
const getAdapter = require('./get-adapter');
const {initWallet, useWallet} = require('solana-wallets-vue');
const SplTokenMetadata = require('@multiplechain/spl-token-metadata');

class Wallet {

    /**
     * @var {Object}
     */
    adapter;

    /**
     * @var {Object}
     */
    wallet;
    
    /**
     * @var {Object}
     */
    provider;

    /**
     * @var {Object}
     */
    solWalletAdapter;
    
    /**
     * @var {String}
     */
    connectedAccount;

    /**
     * @param {String} adapter 
     * @param {Object} provider 
     */
    constructor(adapter, provider) {
        this.provider = provider;
        this.setAdapter(adapter);
    }

    /**
     * @param {String} adapter 
     */
    setAdapter(adapter) {
        this.adapter = getAdapter(adapter, this.provider);
        this.wallet = this.adapter.wallet;

        initWallet({
            wallets: [this.wallet],
            autoConnect: false,
        });
        
        this.solWalletAdapter = useWallet();
    }

    /**
     * @returns {String}
     */
    getKey() {
        return this.adapter.key;
    }

    /**
     * @returns {String}
     */
    getName() {
        return this.adapter.name;
    }

    /**
     * @returns {String}
     */
    getSupports() {
        return this.adapter.supports;
    }

    /**
     * @returns {String}
     */
    getDeepLink() {
        return this.adapter.deepLink;
    }

    /**
     * @returns {String}
     */
    getDownloadLink() {
        return this.adapter.download;
    }

    /**
     * @returns {Boolean}
     */
    isDetected() {
        return this.adapter.isDetected ? this.adapter.isDetected() : undefined;
    }

    getConnectedPublicKey() {
        return this.solWalletAdapter.publicKey.value || this.solWalletAdapter.publicKey;
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            try {
                
                await this.solWalletAdapter.select(this.wallet.name);
                this.wallet.addListener('error', (error) => {
                    utils.rejectMessage(error, reject);
                });

                if (this.getKey() == 'walletconnect') {
                    this.adapter.removeOldConnection();
                }

                await this.solWalletAdapter.connect(this.wallet.name);

                this.provider.setConnectedWallet(this);
                this.connectedAccount = this.getConnectedAccount();

                resolve(this.connectedAccount);
            } catch (error) {
                utils.rejectMessage(error, reject);
            }
        });
    }

    getConnectedAccount() {
        return this.getConnectedPublicKey().toBase58();
    }

    getConnectedWallet() {
        return this.solWalletAdapter.wallet.value || this.solWalletAdapter.wallet;
    }

    /**
     * 
     * @param {Object} transaction 
     * @param {Object} options 
     * @returns 
     */
    sendTransaction(transaction, options = {}) {
        return this.solWalletAdapter.sendTransaction(transaction, this.provider.web3, options);
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @param {String} tokenAddress
     * @return {Transaction|Object}
     * @throws {Error}
     */
    tokenTransfer(to, amount, tokenAddress) {
        return new Promise(async (resolve, reject) => {
            try {
                let token = this.provider.Token(tokenAddress);
                let data = await token.transfer(this.connectedAccount, to, amount);

                this.sendTransaction(data)
                .then((transactionId) => {
                    resolve(this.provider.Transaction(transactionId));
                })
                .catch((error) => {
                    utils.rejectMessage(error, reject);
                });
            } catch (error) {
                utils.rejectMessage(error, reject);
            }
        });
    }

    tokenApprove(spender, amount, tokenAddress) {
        return new Promise(async (resolve, reject) => {
            try {
                let token = this.provider.Token(tokenAddress);
                let data = await token.approve(this.connectedAccount, spender, amount);

                this.sendTransaction(data)
                .then((transactionId) => {
                    resolve(this.provider.Transaction(transactionId));
                })
                .catch((error) => {
                    utils.rejectMessage(error, reject);
                });
            } catch (error) {
                utils.rejectMessage(error, reject);
            }
        });
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @return {Transaction|Object}
     * @throws {Error}
     */
    coinTransfer(to, amount) {
        return new Promise(async (resolve, reject) => {
            try {
                let coin = this.provider.Coin();
                let data = await coin.transfer(this.connectedAccount, to, amount);
                
                this.sendTransaction(data)
                .then((transactionId) => {
                    resolve(this.provider.Transaction(transactionId));
                })
                .catch((error) => {
                    utils.rejectMessage(error, reject);
                });
            } catch (error) {
                utils.rejectMessage(error, reject);
            }
        });
    }

    /**
     * @param {String} to
     * @param {Integer} amount
     * @param {String|null} tokenAddress
     * @return {Transaction|Object}
     * @throws {Error}
     */
    transfer(to, amount, tokenAddress = null) {
        if (tokenAddress) {
            return this.tokenTransfer(to, amount, tokenAddress);
        } else {
            return this.coinTransfer(to, amount);
        }
    }

    /**
     * @param {Number} decimals 
     * @returns {Object}
     */
    async createTokenWithMetadata(metadata) {
        let token = this.provider.Token();
        let {
            signers,
            transaction, 
            tokenAddress
        } = await token.createWithMetadata(this.connectedAccount, metadata);
        let transactionHash = await this.sendTransaction(transaction, {signers});
        return {tokenAddress, transactionHash};
    }

    /**
     * @param {Number} decimals 
     * @returns {Object}
     */
    async createToken(decimals) {
        let token = this.provider.Token();
        let mintAccount = Web3.Keypair.generate();
        let transaction = await token.create(this.connectedAccount, mintAccount, decimals);
        let hash = await this.sendTransaction(transaction, {signers: [mintAccount]});
        return {tokenAddress: mintAccount.publicKey.toString(), hash};
    }

    /**
     * @param {Number} decimals 
     * @returns {Object}
     */
    async createTokenAccount(tokenAddress) {
        let newAcount = Web3.Keypair.generate();
        let token = this.provider.Token(tokenAddress);
        let transaction = await token.createAccount(this.connectedAccount, newAcount);
        let hash = await this.sendTransaction(transaction, {signers: [newAcount]});
        return {tokenAccountAddress: newAcount.publicKey.toString(), hash};
    }

    /**
     * @param {String} tokenAddress 
     * @param {String} tokenAccount 
     * @param {Number} amount 
     * @returns 
     */
    async mintToToken(tokenAddress, tokenAccount, amount) {
        let token = this.provider.Token(tokenAddress);
        let transaction = await token.mintTo(this.connectedAccount, tokenAccount, amount);
        return this.sendTransaction(transaction);
    }

    /**
     * @param {String} tokenAddress 
     * @param {Object} metadata 
     * @returns {String} 
     */
    async createTokenMetadata(tokenAddress, metadata) {
        const stmd = new SplTokenMetadata(this.provider.network.node);
        const instrucion = await stmd.createSplTokenMetadata(this.connectedAccount, tokenAddress, metadata);
        return this.sendTransaction(this.provider.createTransaction(instrucion));
    }

    /**
     * @param {String} tokenAddress 
     * @param {Object} metadata 
     * @returns {String} 
     */
    async updateTokenMetadata(tokenAddress, metadata) {
        const stmd = new SplTokenMetadata(this.provider.network.node);
        const instrucion = await stmd.updateSplTokenMetadata(this.connectedAccount, tokenAddress, metadata);
        return this.sendTransaction(this.provider.createTransaction(instrucion));
    }
} 

module.exports = Wallet;