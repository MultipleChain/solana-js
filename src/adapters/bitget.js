module.exports = (provider) => {

    const { BitKeepWalletAdapter } = require('@solana/wallet-adapter-bitkeep');
    const wallet = new BitKeepWalletAdapter({ network: provider.network.node });

    return {
        key: 'bitget',
        name: 'Bitget Wallet',
        supports: [
            'browser',
            'mobile'
        ],
        wallet,
        deepLink: 'https://bkcode.vip?action=dapp&url={siteUrl}',
        download: 'https://web3.bitget.com/en/wallet-download?type=3',
        detected : Boolean(window.bitkeep && window.bitkeep.solana)
    }
}