module.exports = (provider) => {
    
    const { SlopeWalletAdapter } = require('@solana/wallet-adapter-slope');
    const wallet = new SlopeWalletAdapter({ network: provider.network.node });

    return {
        key: 'slope',
        name: 'Slope',
        supports: [
            'browser'
        ],
        wallet,
        download: 'https://www.slope.finance/',
        isDetected: () => Boolean(window.Slope)
    }
}