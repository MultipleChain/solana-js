module.exports = (provider) => {

    const { CoinbaseWalletAdapter } = require('@solana/wallet-adapter-coinbase');
    const wallet = new CoinbaseWalletAdapter({ network: provider.network.node });

    return {
        key: 'coinbasewallet',
        name: 'Coinbase Wallet',
        supports: [
            'browser',
            'mobile'
        ],
        wallet,
        deepLink: 'https://go.cb-w.com/dapp?cb_url={siteUrl}',
        download: 'https://www.coinbase.com/wallet/downloads',
        isDetected: () => Boolean(window?.coinbaseWalletExtension)
    }
}