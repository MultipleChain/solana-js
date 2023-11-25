module.exports = (provider) => {
    
    const { SolflareWalletAdapter } = require('@solana/wallet-adapter-solflare');
    const wallet = new SolflareWalletAdapter({ network: provider.network.node });

    return {
        key: 'solflare',
        name: 'Solflare',
        type: 'browser',
        supports: [
            'browser',
            'mobile'
        ],
        wallet,
        download: 'https://solflare.com/download#extension',
        deepLink: 'https://solflare.com/ul/v1/browse/{siteUrl}?ref={siteUrl}',
        isDetected: () => Boolean(window.solflare?.isSolflare)
    }
}
