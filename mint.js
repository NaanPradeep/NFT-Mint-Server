const { cardanocliJs } = require("./cardanocli");
const fetch = require("node-fetch");
const metadata = require("./metadata.json");

const createTransaction = (tx) => {
  let raw = cardanocliJs.transactionBuildRaw(tx);
  let fee = cardanocliJs.transactionCalculateMinFee({
    ...tx,
    txBody: raw,
  });
  tx.txOut[0].amount.lovelace -= fee;
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
      { slot: 21560175 + 632000, type: "before" },
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
    { headers: { project_id: "rbkrp5hOr3khPAWNo3x47t6CP7qKFyA5" } }
  )
    .then((res) => res.json())
    .then((res) => res.inputs[0].address);

  const policy = cardanocliJs.transactionPolicyid(mintScript);
  const name = `SpaceBud${id}`;
  const SPACEBUD = policy + `.${name}`;
  const balance = utxo.amount;
  balance.lovelace -= cardanocliJs.toLovelace(1.5);
  const [ziegAmount, alesAmount] = [
    balance.lovelace - Math.floor(balance.lovelace / 2),
    Math.floor(balance.lovelace / 2),
  ];

  const tx = {
    txIn: [utxo],
    txOut: [
      {
        address:
          "addr_test1qzuyhmjlv2qcg5rrk9hxp9hen595m7h8zs4h5yfz743k86gjx0wny5qwycfv0qp94vml3dqp3590v4f4xv2xym02eypqjc2430",
        amount: { lovelace: alesAmount },
      },
      {
        address:
          "addr_test1qrez968pdxa5p55jpq4apn7uxv0msdeq8fa8x5su54s9k4gjx0wny5qwycfv0qp94vml3dqp3590v4f4xv2xym02eypqwleec8",
        amount: { lovelace: ziegAmount },
      },
      {
        address: receiver,
        amount: {
          ...balance,
          [SPACEBUD]: 1,
          lovelace: cardanocliJs.toLovelace(1.5),
        },
      },
    ],
    mint: [{ action: "mint", amount: 1, token: SPACEBUD }],
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
    { headers: { project_id: "rbkrp5hOr3khPAWNo3x47t6CP7qKFyA5" } }
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
          "Refund. Amount matches no SpaceBud. Please send the exact amount",
      },
    },
  };

  const raw = createTransaction(tx);
  const signed = signTransactionRefund(wallet, raw, mintScript);
  const txHash = cardanocliJs.transactionSubmit(signed);
  return txHash;
};
