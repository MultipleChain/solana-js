module.exports = slope = (provider) => {
    
    const { SlopeWalletAdapter } = require('@solana/wallet-adapter-slope');
    const wallet = new SlopeWalletAdapter({ network: provider.network.node });

    return {
        key: 'slope',
        name: 'Slope',
        type: 'browser',
        wallet
    }
}