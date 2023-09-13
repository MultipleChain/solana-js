module.exports = walletconnect = (provider) => {

    const WalletConnectWalletAdapter = require('../walletconnect-solana/index');

    const wallet = new WalletConnectWalletAdapter({ 
        network: provider.network.node,
        options: {
            projectId: provider.wcProjectId,
            relayUrl: 'wss://relay.walletconnect.com',
            qrcodeModalOptions: { 
                mobileLinks: [
                    "trust"
                ],
                desktopLinks: [
                    // 'zerion', 
                    // 'ledger'
                ]
            }
        },
    });

    return {
        key: 'walletconnect',
        name: 'WalletConnect (Only Trust Wallet)',
        supports: [
            'browser',
            'mobile'
        ],
        wallet,
        removeOldConnection: () => {
            Object.keys(localStorage)
            .filter(x => x.startsWith('wc@2'))
            .forEach(x => localStorage.removeItem(x));
            localStorage.removeItem('walletconnect');
            localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
        }
    }
}
