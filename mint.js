const { cardanocliJs } = require("./cardanocli");
const fetch = require("node-fetch");
const metadata = require("./metadata.json");
const execSync = require('child_process').execSync;
const createTransaction = (tx) => {
  let raw = cardanocliJs.transactionBuildRaw(tx);
  let fee = cardanocliJs.transactionCalculateMinFee({
    ...tx,
    txBody: raw,
  });
  tx.txOut[0].value.lovelace -= fee;
  return cardanocliJs.transactionBuildRaw({ ...tx, fee });
};
const signTransaction = (wallet, tx, script) => {
  return cardanocliJs.transactionSign({
    signingKeys: [wallet.payment.skey, wallet.payment.skey],
    scriptFile: script,
    txBody: tx,
  });
};
const signTransactionRefund = (wallet, tx) => {
  return cardanocliJs.transactionSign({
    signingKeys: [wallet.payment.skey],
    txBody: tx,
  });
};
exports.initateMint = async (_utxo, id) => {
  const wallet = cardanocliJs.wallet("Test");
  const mintScript = {
    type: "all",
    scripts: [
      { slot: 45700368 + 632000, type: "before" },
      {
        keyHash: cardanocliJs.addressKeyHash(wallet.name),
        type: "sig",
      },
    ],
  };
  const utxo = JSON.parse(JSON.stringify(_utxo));
  const oldTxHash = utxo.txHash;
  const receiver = await fetch(
    `https://cardano-testnet.blockfrost.io/api/v0/txs/${oldTxHash}/utxos`,
    { headers: { project_id: "PROJECT_ID" } }
  )
  .then((res) => res.json())
    .then((res) => res.inputs[0].address);
  const policy = cardanocliJs.transactionPolicyid(mintScript);
  const name = `CoCatz${id}`;
  const encodedName = execSync(`echo -n ${name} | xxd -ps`, { encoding: 'utf-8' });
  const COCATZ = policy + `.${encodedName}`;
  const balance = utxo.value;
  balance.lovelace -= cardanocliJs.toLovelace(1.5);
  const tx = {
    txIn: [utxo],
    txOut: [
      {
        address:
          "addr_test1qz6avr9pvt8a29625pvt7cgf9453rh0tvll0ne4fkmhtu4vtntrjh6lz39d9rcc8wakk5qm0gelnxr20zpag473z7tmqanrnzs",
        value: { lovelace: balance.lovelace },
      },
      {
        address: receiver,
        value: {
          [COCATZ]: 1,
          lovelace: cardanocliJs.toLovelace(1.5),
        },
      },
    ],
    mint: [{ action: "mint", quantity: 1, asset: COCATZ, script: mintScript}],
    metadata: { 721: { [policy]: { [name]: metadata[id] } } },
    witnessCount: 2,
  };
  const raw = createTransaction(tx);
  const signed = signTransaction(wallet, raw, mintScript);
  const txHash = cardanocliJs.transactionSubmit(signed);
  return txHash;
};
exports.initateRefund = async (_utxo) => {
  const wallet = cardanocliJs.wallet("Test");
  const mintScript = {
    keyHash: cardanocliJs.addressKeyHash(wallet.name),
    type: "sig",
  };
  const utxo = JSON.parse(JSON.stringify(_utxo));
  const oldTxHash = utxo.txHash;
  const receiver = await fetch(
    `https://cardano-testnet.blockfrost.io/api/v0/txs/${oldTxHash}/utxos`,
    { headers: { project_id: "testnet5APdWV3eEMTRg3v1vpB0V4PDoRGOAdWH" } }
  )
    .then((res) => res.json())
    .then((res) => res.inputs[0].address);
  const balance = utxo.amount;
  const tx = {
    txIn: [utxo],
    txOut: [
      {
        address: receiver,
        amount: balance,
      },
    ],
    witnessCount: 1,
    metadata: {
      0: {
        message:
          "Refund. Amount matches no CoCatz. Please send the exact amount",
      },
    },
  };
  const raw = createTransaction(tx);
  const signed = signTransactionRefund(wallet, raw, mintScript);
  const txHash = cardanocliJs.transactionSubmit(signed);
  return txHash;
};
