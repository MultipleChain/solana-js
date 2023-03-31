const utils = require('../utils');
const Web3 = require('@solana/web3.js');
const SplToken = require('@solana/spl-token');
const {TokenListProvider} = require('@solana/spl-token-registry');

class Token {
    
    /**
     * @var {String} 
     */
    address;

    /**
     * @var {Object} 
     */
    provider;

    /**
     * @var {Array} 
     */
    tokenList;

    /**
     * @param {String} address 
     * @param {Provider} provider
     */
    constructor(address, provider) {
        this.address = address;
        this.provider = provider;
        
        new TokenListProvider().resolve().then(tokens => {
            const tokenList = tokens.filterByClusterSlug(this.provider.network.node).getList();
        
            this.tokenList = tokenList.reduce((map, item) => {
                map.set(item.address, item);
                return map;
            },  new Map());
        });
    }

    /**
     * @returns {String}
     */
    getAddress() {
        return this.address;
    }
    
    /**
     * @returns {String|Object}
     */
    getName() {
        return this.methods.name().call();
    }

    /**
     * @returns {String|Object}
     */
    getSymbol() {
        return this.methods.symbol().call();
    }

    /**
     * @returns {String|Object}
     */
    getDecimals() {
        return this.methods.decimals().call();
    }

    /**
     * @returns {Float|Object}
     */
    async getTotalSupply() {
        let decimals = await this.getDecimals();
        let totalSupply = await this.methods.totalSupply().call();
        return utils.toDec(totalSupply, decimals);
    }

    
    /**
     * @param {String} from 
     * @returns {Number}
     */
    async getBalance(from) {
        return (await this.getInfo(from)).uiAmount;
    }

    /**
     * @param {String} from 
     * @returns {Object}
     */
    async getInfo(from) {
        const tokenPublicKey = new Web3.PublicKey(this.address);

        const token = this.splTokenInstance(this.address);
        const fromPublicKey = new Web3.PublicKey(from);
        const tokenAccount = await SplToken.Token.getAssociatedTokenAddress(
            token.associatedProgramId,
            token.programId,
            tokenPublicKey,
            fromPublicKey
        );

        let tokenInfo = {};
        try {
            tokenInfo = await this.provider.web3.getTokenAccountBalance(tokenAccount);
        } catch (error) {

            let tokenInfoByList = this.tokenList.get(this.address);

            tokenInfo.value = {
                amount: "0",
                uiAmount: 0,
                uiAmountString: "0",
                decimals: tokenInfoByList.decimals
            };
        }

        return Object.assign(tokenInfo.value, {tokenAccount: tokenAccount.toBase58(), tokenAddress: this.address});
    }

    /**
     * @param {String} tokenAccount 
     * @returns 
     */
    async getAccountInfo(tokenAccount) {
        const token = this.splTokenInstance(this.address);
        return await token.getAccountInfo((new Web3.PublicKey(tokenAccount)));
    }

    /**
     * @param {String} to
     * @param {Integer} amount
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

                const programId = this.getProgramId();
                const fromPublicKey = new Web3.PublicKey(from);
                const toPublicKey = new Web3.PublicKey(to);
                const tokenPublicKey = new Web3.PublicKey(this.address);
                const tokenInfo = await this.getInfo(this.address);
                amount = parseInt(utils.toHex(amount, tokenInfo.decimals), 16);
    
                const token = this.splTokenInstance(this.address);
    
                const fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(fromPublicKey);
    
                const toTokenAccount = await SplToken.Token.getAssociatedTokenAddress(
                    token.associatedProgramId,
                    token.programId,
                    tokenPublicKey,
                    toPublicKey
                );

                const receiverAccount = await this.getAccountInfo(toTokenAccount);

                const transaction = new Web3.Transaction();
                if (receiverAccount === null) {
                    transaction.add(
                        SplToken.Token.createAssociatedTokenAccountInstruction(
                            token.associatedProgramId,
                            token.programId,
                            tokenPublicKey,
                            toTokenAccount,
                            toPublicKey,
                            fromPublicKey
                        )
                    )
                }
                
                transaction.add(
                    SplToken.Token.createTransferInstruction(
                        programId,
                        fromTokenAccount.address,
                        toTokenAccount, 
                        fromPublicKey,
                        [],
                        amount
                    )
                );
    
                return resolve(transaction);
            } catch (error) {
                return reject(error);
            }
        });
    }

    /**
     * @param {String} from
     * @param {String} tokenAccount 
     * @param {Number} amount 
     * @returns 
     */
    async mintTo(from, tokenAccount, amount) {
        tokenAccount = new Web3.PublicKey(tokenAccount);
        const token = this.splTokenInstance(this.address);
        const mintInfo = await token.getMintInfo(this.address);
        const publicKey = new Web3.PublicKey(from);

        return this.provider.createTransaction(
            SplToken.Token.createMintToInstruction(
                this.getProgramId(),
                token.publicKey,
                tokenAccount, 
                publicKey,
                [],
                utils.toHex(amount, mintInfo.decimals)
            )
        );
    }

    /**
     * @param {String} from 
     * @param {Object} newAcount
     * @returns 
     */
    async createAccount(from, newAcount) {
        const token = this.splTokenInstance(this.address);
        const publicKey = new Web3.PublicKey(from);
        
        const balanceNeeded = await SplToken.Token.getMinBalanceRentForExemptAccount(this.provider.web3);

        const transaction = this.web3.createTransaction(
            Web3.SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: newAcount.publicKey,
                lamports: balanceNeeded,
                space: SplToken.AccountLayout.span,
                programId: this.getProgramId()
            })
        );

        transaction.add(
            SplToken.Token.createInitAccountInstruction(
                this.getProgramId(),
                token.publicKey,
                newAcount.publicKey,
                publicKey
            )
        );
        
        return transaction;
    }

    /**
     * @param {String} from
     * @param {Object} mintAccount
     * @param {Number} decimals 
     * @returns {Object}
     */    
    async create(from, mintAccount, decimals) {
        
        const publicKey = new Web3.PublicKey(from);
        
        const balanceNeeded = await SplToken.Token.getMinBalanceRentForExemptMint(this.provider.web3);

        const transaction = this.provider.createTransaction(
            Web3.SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: mintAccount.publicKey,
                lamports: balanceNeeded,
                space: SplToken.MintLayout.span,
                programId: this.getProgramId()
            })
        );

        transaction.add(
            SplToken.Token.createInitMintInstruction(
                this.getProgramId(),
                mintAccount.publicKey,
                decimals, 
                publicKey,
                publicKey
            )
        );

        return transaction;
    }

    /**
     * @param {String} tokenAddress 
     * @returns 
     */
    splTokenInstance(tokenAddress) {
        return new SplToken.Token(
            this.provider.web3,
            new Web3.PublicKey(tokenAddress),
            this.getProgramId()
        );
    }

    getProgramId() {
        return SplToken.TOKEN_PROGRAM_ID;
    }
}

module.exports = Token;