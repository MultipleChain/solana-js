const utils = require('../utils');
const Web3 = require('@solana/web3.js');
const SplToken = require('@solana/spl-token');
const { Metaplex } = require('@metaplex-foundation/js');
const {TokenListProvider} = require('@solana/spl-token-registry');
const SplTokenMetadata = require('@multiplechain/spl-token-metadata');

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
     * @var {Object} 
     */
    tokenInfo;

    /**
     * @var {Object}
     */
    metadata;

    /**
     * @var {Object}
     */
    testnetTokens = {
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
            name: "USD Coin",
            symbol: "USDC",
            decimals: 6,
            address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        }
    }

    /**
     * @param {String} address 
     * @param {Provider} provider
     */
    constructor(address, provider) {
        this.address = address;
        this.provider = provider;
    }

    /**
     * @param {String|null} from
     * @returns {Object}
     * @returns {Object|String}
     */
    getInfo(from = null) {
        return new Promise((resolve, reject) => {
            new TokenListProvider().resolve().then(async(tokens) => {
                let tokenList = tokens.filterByClusterSlug(this.provider.network.node).getList();
                let tokenInfo = tokenList.find(x => x.address === this.address);
                if (!tokenInfo) {
                    tokenInfo = await this.getTokenInfoWithDifferentWays(from);
                    if (!tokenInfo) {
                        return reject('token-metadata-not-found');
                    }
                }
                resolve(this.tokenInfo = tokenInfo ? tokenInfo : this.testnetTokens[this.address]);
            });
        });
    }

    async getTokenMetadata() {
        const metaplex = Metaplex.make(this.provider.web3);
        const mintAddress = new Web3.PublicKey(this.address);
        return this.metadata = await metaplex.nfts().findByMint({ mintAddress: mintAddress });
    }

    /**
     * @param {String|null} from 
     * @returns {Object|String}
     */
    async getTokenInfoWithDifferentWays(from = null) {
        return new Promise(async (resolve, reject) => {
            try {
                
                const token = this.splTokenInstance(this.address);
                const mintInfo = await token.getMintInfo(this.address);
                
                if (mintInfo) {
                    return resolve({
                        decimals : mintInfo.decimals,
                    });
                }

                if (from) {
                    const tokenPublicKey = new Web3.PublicKey(this.address);
                    const fromPublicKey = new Web3.PublicKey(from);
                    const tokenAccount = await SplToken.Token.getAssociatedTokenAddress(
                        token.associatedProgramId,
                        token.programId,
                        tokenPublicKey,
                        fromPublicKey
                    );
                    let tokenInfo = await this.provider.web3.getTokenAccountBalance(tokenAccount);
                    return resolve({
                        decimals : tokenInfo.value.decimals,
                    });
                }
            } catch (error) {
                return reject('token-metadata-not-found');
            }
        });
    }

    /**
     * @returns {String}
     */
    getAddress() {
        return this.address;
    }
    
    /**
     * @returns {String}
     */
    async getName() {
        await this.getInfo();
        if (this.tokenInfo.name) {
            return this.tokenInfo.name;
        }
        await this.getTokenMetadata();
        return this.metadata?.name; 
    }

    /**
     * @returns {String}
     */
    async getSymbol() {
        await this.getInfo();
        if (this.tokenInfo.symbol) {
            return this.tokenInfo.symbol;
        }
        await this.getTokenMetadata();
        return this.metadata?.symbol;
    }

    /**
     * @param {String|null} from
     * @returns {Number}
     */
    async getDecimals(from = null) {
        await this.getInfo(from);
        if (this.tokenInfo.decimals) {
            return this.tokenInfo.decimals;
        }
        await this.getTokenMetadata();
        return this.metadata?.mint?.decimals;
    }

    async getTotalSupply() {
        let result = await this.provider.request('getTokenSupply', [this.address]);
        return result.value.uiAmount;
    }
    
    /**
     * @param {String} from 
     * @returns {Number}
     */
    async getBalance(from) {
        try {
            const tokenPublicKey = new Web3.PublicKey(this.address);

            const token = this.splTokenInstance(this.address);
            const fromPublicKey = new Web3.PublicKey(from);
            const tokenAccount = await SplToken.Token.getAssociatedTokenAddress(
                token.associatedProgramId,
                token.programId,
                tokenPublicKey,
                fromPublicKey
            );

            let tokenInfo = await this.provider.web3.getTokenAccountBalance(tokenAccount);

            return tokenInfo ? tokenInfo.value.uiAmount : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * @param {String|Null} tokenAccount 
     * @returns 
     */
    async getAccountInfo(tokenAccount) {
        try {
            const token = this.splTokenInstance(this.address);
            return await token.getAccountInfo((new Web3.PublicKey(tokenAccount)));
        } catch (error) {
            return null;
        }
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
                amount = parseInt(utils.toHex(amount, await this.getDecimals(from)), 16);
    
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
     * @param {Number} decimals 
     * @returns {Object}
     */    
    async createWithMetadata(from, metadata) {
        
        await utils.validateTokenMetaData(metadata);

        const fromPublicKey = new Web3.PublicKey(from);
        const newTokenAccount = Web3.Keypair.generate();
        const newTokenMintAccount = Web3.Keypair.generate();
        const signers = [newTokenAccount, newTokenMintAccount];

        const balanceNeededMint = await SplToken.Token.getMinBalanceRentForExemptMint(this.provider.web3);
        const balanceNeededAccount = await SplToken.Token.getMinBalanceRentForExemptAccount(this.provider.web3);

        const transaction = this.provider.createTransaction(
            Web3.SystemProgram.createAccount({
                fromPubkey: fromPublicKey,
                newAccountPubkey: newTokenMintAccount.publicKey,
                lamports: balanceNeededMint,
                space: SplToken.MintLayout.span,
                programId: this.getProgramId()
            })
        );

        transaction.add(
            SplToken.Token.createInitMintInstruction(
                this.getProgramId(),
                newTokenMintAccount.publicKey,
                metadata.decimals, 
                fromPublicKey,
                fromPublicKey
            )
        );

        transaction.add(
            Web3.SystemProgram.createAccount({
                fromPubkey: fromPublicKey,
                newAccountPubkey: newTokenAccount.publicKey,
                lamports: balanceNeededAccount,
                space: SplToken.AccountLayout.span,
                programId: this.getProgramId()
            })
        );
        
        transaction.add(
            SplToken.Token.createInitAccountInstruction(
                this.getProgramId(),
                newTokenMintAccount.publicKey,
                newTokenAccount.publicKey,
                fromPublicKey
            )
        );

        const supply = utils.supplyFormat(metadata.supply, metadata.decimals);

        transaction.add(
            SplToken.Token.createMintToInstruction(
                this.getProgramId(),
                newTokenMintAccount.publicKey,
                newTokenAccount.publicKey, 
                fromPublicKey,
                [],
                supply
            )
        );

        const stmd = new SplTokenMetadata(this.provider.network.node);

        transaction.add(
            await stmd.createSplTokenMetadata(
                from, 
                newTokenMintAccount.publicKey.toString(), 
                metadata
            )
        );

        return {transaction, signers, tokenAddress: newTokenMintAccount.publicKey.toString()};
    }
    
    
    /**
     * @param {String} from
     * @param {Object} mintAccount
     * @param {Number} decimals 
     * @returns {Object}
     */    
    async create(from, mintAccount, decimals) {
        
        const fromPublicKey = new Web3.PublicKey(from);
        
        const balanceNeeded = await SplToken.Token.getMinBalanceRentForExemptMint(this.provider.web3);

        const transaction = this.provider.createTransaction(
            Web3.SystemProgram.createAccount({
                fromPubkey: fromPublicKey,
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
                fromPublicKey,
                fromPublicKey
            )
        );

        return transaction;
    }

    /**
     * @param {String} from 
     * @param {Object} newAcount
     * @returns 
     */
    async createAccount(from, newAcount) {
        const token = this.splTokenInstance(this.address);
        const fromPublicKey = new Web3.PublicKey(from);
        
        const balanceNeeded = await SplToken.Token.getMinBalanceRentForExemptAccount(this.provider.web3);

        const transaction = this.provider.createTransaction(
            Web3.SystemProgram.createAccount({
                fromPubkey: fromPublicKey,
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
                fromPublicKey
            )
        );
        
        return transaction;
    }

    /**
     * @param {String} from
     * @param {String} tokenAccount 
     * @param {Number} supply 
     * @returns 
     */
    async mintTo(from, tokenAccount, supply) {
        tokenAccount = new Web3.PublicKey(tokenAccount);
        const token = this.splTokenInstance(this.address);
        const mintInfo = await token.getMintInfo(this.address);
        const fromPublicKey = new Web3.PublicKey(from);

        supply = utils.supplyFormat(supply, mintInfo.decimals);

        return this.provider.createTransaction(
            SplToken.Token.createMintToInstruction(
                this.getProgramId(),
                token.publicKey,
                tokenAccount, 
                fromPublicKey,
                [],
                supply
            )
        );
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