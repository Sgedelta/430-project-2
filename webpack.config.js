/* eslint-disable max-len */
/* eslint-disable indent */ // < eslint shouldn't really be touching this file (it won't fix it with npm test), but it is.

const path = require('path');

module.exports = {
    entry: {
        app: './client/game.jsx',
        login: './client/login.jsx',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                },
            },
        ],
    },
    mode: 'production',
    watchOptions: {
        aggregateTimeout: 200,
    },
    output: {
        path: path.resolve(__dirname, 'hosted'),
        filename: '[name]Bundle.js',
    },
};