const adapters = {
    phantom: require('./adapters/phantom'),
    slope: require('./adapters/slope'),
    solflare: require('./adapters/solflare'),
    walletconnect: require('./adapters/walletconnect'),
    trustwallet: require('./adapters/trustwallet'),
    bitget: require('./adapters/bitget'),
    coinbasewallet: require('./adapters/coinbasewallet'),
    tokenpocket: require('./adapters/tokenpocket'),
    torus: require('./adapters/torus'),
}

/**
 * @param {String} adapter
 * @param {Object} provider
 */
module.exports = getAdapter = (adapter, provider) => {
    return adapters[adapter](provider);
}