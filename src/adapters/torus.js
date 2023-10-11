module.exports = (provider) => {

    const { TorusWalletAdapter } = require('@solana/wallet-adapter-torus');
    const wallet = new TorusWalletAdapter({ network: provider.network.node });

    return {
        key: 'torus',
        name: 'Torus Wallet',
        supports: [
            'web'
        ],
        wallet,
    }
}