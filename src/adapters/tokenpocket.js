module.exports = (provider) => {

    const { TokenPocketWalletAdapter } = require('@solana/wallet-adapter-tokenpocket');
    const wallet = new TokenPocketWalletAdapter({ network: provider.network.node });

    return {
        key: 'tokenpocket',
        name: 'TokenPocket',
        supports: [
            'mobile'
        ],
        wallet,
        deepLink: 'tpdapp://open?params=' + JSON.stringify({
            "url": "{siteUrl}", 
            "chain": "Solana",
            "source": "{siteUrl}",
        }),
        download: 'https://www.tokenpocket.pro/en/download/app',
        detected : Boolean(window.tokenpocket && window.tokenpocket.solana)
    }
}