module.exports = solflare = (provider) => {
    
    const { SolflareWalletAdapter } = require('@solana/wallet-adapter-solflare');
    const wallet = new SolflareWalletAdapter({ network: provider.network.node });

    return {
        key: 'solflare',
        name: 'Solflare',
        type: 'browser',
        wallet
    }
}
