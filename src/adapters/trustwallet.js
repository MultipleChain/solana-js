module.exports = (provider) => {

    const { TrustWalletAdapter } = require('@solana/wallet-adapter-trust');
    const wallet = new TrustWalletAdapter({ network: provider.network.node });

    return {
        key: 'trustwallet',
        name: 'Trust Wallet',
        supports: [
            'browser',
            'mobile'
        ],
        wallet,
        download: 'https://trustwallet.com/download',
        detected : Boolean(window?.ethereum?.isTrust || window?.trustwallet)
    }
}