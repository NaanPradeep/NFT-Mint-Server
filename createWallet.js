const CardanocliJs = require("cardanocli-js");
const dir = path.join(os.homedir(), "testnet");
const shelleyGenesisPath = path.join(dir,"cardano","testnet-shelley-genesis.json");
const options={}
options.shelleyGenesisPath = shelleyGenesisPath;
options.network = "testnet-magic 1097911063";
options.dir = dir;
options.era = "mary";
options.socketPath = path.join(dir,"db","socket");

const cardanocliJs = new CardanocliJs(options);

const createWallet = (account) => {
    try{
        paymentKeys = cardanocliJs.addressKeyGen(account);
        stakeKeys   = cardanocliJs.stakeAddressKeyGen(account);
        stakeAddr   = cardanocliJs.stakeAddressBuild(account);
        paymentAddr = cardanocliJs.addressBuild(account,{
            "paymentVkey": paymentKeys.vkey,
            "stakeVkey": stakeKeys.vkey
        });
        return cardanocliJs.wallet(account);
    }
    catch(err){
        console.log(err)
    }

};



const wallet = createWallet("Test");

console.log(wallet.paymentAddr);
console.log(pool.vrf.vkey);