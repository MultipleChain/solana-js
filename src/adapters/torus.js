module.exports = (provider) => {

    if (window.crypto && !window.crypto.randomUUID) {
        window.crypto.randomUUID = () => {
            let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
            return uuid;
        };
    }
    
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