module.exports = (provider) => {
    
    const { PhantomWalletAdapter } = require('@solana/wallet-adapter-phantom');
    const wallet = new PhantomWalletAdapter({ network: provider.network.node });

    return {
        key: 'phantom',
        name: 'Phantom',
        supports: [
            'browser',
            'mobile'
        ],
        wallet,
        download: 'https://phantom.app/download',
        deepLink: 'https://phantom.app/ul/browse/{siteUrl}?ref={siteUrl}',
        isDetected: () => Boolean(window.phantom?.solana?.isPhantom && !window.phantom?.connect)
    }
}
