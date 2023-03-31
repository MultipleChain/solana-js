module.exports = phantom = (provider) => {
    
    const { PhantomWalletAdapter } = require('@solana/wallet-adapter-phantom');
    const wallet = new PhantomWalletAdapter({ network: provider.network.node });

    return {
        key: 'phantom',
        name: 'Phantom',
        type: 'browser',
        wallet,
        download: 'https://phantom.app/'
    }
}
