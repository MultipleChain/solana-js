const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './src/provider.js',
    output: {
        path: path.join(__dirname, "/dist"),
        filename: 'solana-provider.js',
        library: 'Solana',
        libraryTarget: 'umd',
        globalObject: 'this',
        umdNamedDefine: true,
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
    resolve: {
        extensions: ["", ".js", ".jsx"],
        fallback: {
            http: false, 
            https: false,
            stream: false
        }
    }
};