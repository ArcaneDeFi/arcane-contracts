const HDWalletProvider = require('@truffle/hdwallet-provider');
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 8545,
            network_id: "*",
            skipDryRun: true,
            gas: 8000000,
            disableConfirmationListener: true,
        },
        ropsten: {
            provider: function() {
                return new HDWalletProvider([process.env.PRIVATE_KEY], `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
            },
            network_id: '3',
            gas: 8000000,
            gasPrice: 30000000000,
        },
        goerli: {
            provider: function() {
                return new HDWalletProvider([process.env.PRIVATE_KEY], `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
            },
            network_id: '5',
            gas: 4465030,
            gasPrice: 10000000000,
        },

        rinkeby: {
            provider: function() {
                return new HDWalletProvider([process.env.PRIVATE_KEY], `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
            },
            network_id: '4',
            gasPrice: 13000000000,
            gas: 22000000
        },
        kovan: {
            provider: function() {
                return new HDWalletProvider([process.env.PRIVATE_KEY], `https://kovan.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
            },
            network_id: 0x2a,
            gasPrice: 30000000,
            gas: 12000000
        },
        bsc_testnet: {
            provider: () => new HDWalletProvider([process.env.PRIVATE_KEY], `https://data-seed-prebsc-1-s1.binance.org:8545`),
            network_id: 97,
            confirmations: 2,
            timeoutBlocks: 200,
            gas: 5000000,
            gasPrice: 30000000000,

        },
        mumbai: {
            provider: function() {
                return new HDWalletProvider([process.env.PRIVATE_KEY], `https://rpc-mumbai.maticvigil.com/v1/${process.env.MATIC_VIGIL_PROJECT_ID}`);
            },
            network_id: '80001',
            confirmations: 3,
            timeoutBlocks: 200,
            gas: 6000000,
            gasPrice: 30000000000
        }
    },

    mocha: {
        enableTimeouts: false,
        useColors: true,
        color: true,
        reporter: 'eth-gas-reporter',
        reporterOptions: {
            showTimeSpent: true,
            currency: 'USD',
            coinmarketcap: `${process.env.COINMARKETCAP_API_KEY}`
        },
        fgrep: '[skip-on-coverage]',
        invert: true,
    },

    compilers: {
        solc: {
            version: "0.8.9",
            docker: false,
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                evmVersion: "istanbul"
            }
        }
    },

    plugins: ["solidity-coverage", 'truffle-plugin-verify', "truffle-contract-size"],

    api_keys: {
        etherscan: `${process.env.ETHERSCAN_API_KEY}`,
        polygonscan: `${process.env.POLYGON_API_KEY}`,
        bsc_testnet: `${process.env.BSC_API_KEY}`,
        bsc: `${process.env.BSC_API_KEY}`,
        bscscan: `${process.env.BSC_API_KEY}`,
        snowtrace: `${process.env.AVAX_API_KEY}`,
        avax: `${process.env.AVAX_API_KEY}`

    }
};