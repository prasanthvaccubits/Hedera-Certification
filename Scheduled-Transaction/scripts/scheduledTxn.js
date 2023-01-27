const {
  TransferTransaction,
  Client,
  ScheduleCreateTransaction,
  ScheduleInfoQuery,
  PrivateKey,
  Hbar,
  AccountId,
  ScheduleId,
  Timestamp,
} = require('@hashgraph/sdk');
require('dotenv').config();

//Grab your Hedera testnet account ID and private key from your .env file
const { ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY, ACCOUNT_2_ID } = process.env;

const main = async () => {
  const txnInBase64 = await createScheduleTxnObj();
  const scheduleId = await executeScheduleTxn(txnInBase64);
  await queryScheduledTxn(scheduleId);
  process.exit();
};

//To create client object
const getClient = async () => {
  // If we weren't able to grab it, we should throw a new error
  if (ACCOUNT_1_ID == null || ACCOUNT_1_PRIVATE_KEY == null) {
    throw new Error(
      'Environment variables ACCOUNT_1_ID and ACCOUNT_1_PRIVATE_KEY must be present'
    );
  }

  // Create our connection to the Hedera network
  return Client.forTestnet().setOperator(ACCOUNT_1_ID, ACCOUNT_1_PRIVATE_KEY);
};

const createScheduleTxnObj = async () => {
  const client = await getClient();

  //Create a transaction to schedule
  const transaction = new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(ACCOUNT_1_ID), Hbar.fromString('-10'))
    .addHbarTransfer(AccountId.fromString(ACCOUNT_2_ID), Hbar.fromString('10'));

  //Schedule a transaction
  const transactionObj = new ScheduleCreateTransaction()
    .setScheduledTransaction(transaction)
    .setScheduleMemo('Scheduled Transaction From Account 1 to Account 2')
    .setAdminKey(PrivateKey.fromString(ACCOUNT_1_PRIVATE_KEY))
    .freezeWith(client);

  //Converting to bytes
  const txnInBytes = transactionObj.toBytes();

  //Converting to base64
  const txnInBase64 = Buffer.from(txnInBytes).toString('base64');
  return txnInBase64;
};

const executeScheduleTxn = async (txnInBase64) => {
  const client = await getClient();

  //Converting to bytes
  const txnInBytes = Buffer.from(txnInBase64, 'base64');

  //Rebuilding transaction
  const transaction = ScheduleCreateTransaction.fromBytes(txnInBytes);

  //Submitting transaction
  const signedTransaction = await transaction.sign(
    PrivateKey.fromString(ACCOUNT_1_PRIVATE_KEY)
  );

  const txResponse = await signedTransaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  console.log(
    `Creating and executing transaction ${txResponse.transactionId.toString()} status: ${
      receipt.status
    }`
  );

  //Get the schedule ID
  const scheduleId = receipt.scheduleId;
  console.log('The schedule ID is ' + scheduleId);
  return scheduleId;
};

const queryScheduledTxn = async (scheduleId) => {
  const client = await getClient();
  //Create the query
  const info = await new ScheduleInfoQuery().setScheduleId(scheduleId).execute(client);

  //Consoling the information
  console.log('\n\nScheduled Transaction Info -');
  console.log('ScheduleId :', new ScheduleId(info.scheduleId).toString());
  console.log('Memo : ', info.scheduleMemo);
  console.log('Created by : ', new AccountId(info.creatorAccountId).toString());
  console.log('Payed by : ', new AccountId(info.payerAccountId).toString());
  console.log('Expiration time : ', new Timestamp(info.expirationTime).toDate());
  if (
    new Timestamp(info.executed).toDate().getTime() ===
    new Date('1970-01-01T00:00:00.000Z').getTime()
  ) {
    console.log('The transaction has not been executed yet.');
  } else {
    console.log('Time of execution : ', new Timestamp(info.executed).toDate());
  }
};

main();
