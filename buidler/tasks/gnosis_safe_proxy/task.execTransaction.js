import { task, types } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gsp-exectransaction",
  `Sends a tx to gnosisSafeProxy.execTransaction() on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "gnosissafeproxyaddress",
    "the executor's price per gas unit of mintingDepositPayable"
  )
  .addPositionalParam("contractname", "The contract whose abi has the function")
  .addPositionalParam("functionname", "The function we want to call")
  .addVariadicPositionalParam("inputs", "The parameters for the function call")
  .addOptionalParam(
    "to",
    "The address which to call/delegatecall. Defaults to <gnosissafeproxyaddress>"
  )
  .addOptionalParam(
    "value",
    "The value to sent along with the tx",
    0,
    types.int
  )
  .addOptionalParam(
    "operation",
    "0-Call or 1-Delegatecall to <to>",
    0,
    types.int
  )
  .addOptionalParam(
    "safetxgas",
    "Max gas for relay service. 0 for gasleft or nor relay",
    0,
    types.int
  )
  .addOptionalParam(
    "basegas",
    "BaseGas for relay refund calculations. 0 for no relay.",
    0,
    types.int
  )
  .addOptionalParam(
    "gasprice",
    "The gasprice for relayer service. 0 for no relay.",
    0,
    types.int
  )
  .addOptionalParam(
    "gastoken",
    "For relay service refund in token. 0x0 for no relay",
    constants.AddressZero
  )
  .addOptionalParam(
    "refundreceiver",
    "Relay service payee. 0x0 for no relay.",
    constants.AddressZero
  )
  .addOptionalParam(
    "signatures",
    "Packed signature data ({bytes32 r}{bytes32 s}{uint8 v}). Defaults to pre-validated signature for msg.sender == owner"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async taskArgs => {
    try {
      if (!taskArgs.to) taskArgs.to = taskArgs.gnosissafeproxyaddress;

      const data = await run("abi-encode-withselector", {
        contractname: taskArgs.contractname,
        functionname: taskArgs.functionname,
        inputs: taskArgs.inputs
      });

      const signer = await run("ethers", { signer: true, address: true });

      if (!taskArgs.signatures) {
        taskArgs.signatures = `0x000000000000000000000000${signer.replace(
          "0x",
          ""
        )}000000000000000000000000000000000000000000000000000000000000000001`;
      }

      if (taskArgs.log) {
        console.log(
          `\n GnosisSafe.execTransaction:\
           \n To: ${taskArgs.contractname} at ${taskArgs.to}\
           \n Function: ${taskArgs.functionname}\
           \n Data:\n ${data}\
           \n Signatures:\n ${taskArgs.signatures}\n`
        );
      }

      const gnosisSafeProxy = await run("instantiateContract", {
        contractname: "IGnosisSafe",
        contractaddress: taskArgs.gnosissafeproxyaddress,
        write: true
      });

      const executeTx = await gnosisSafeProxy.execTransaction(
        taskArgs.to,
        taskArgs.value,
        data,
        taskArgs.operation,
        taskArgs.safetxgas,
        taskArgs.basegas,
        taskArgs.gasprice,
        taskArgs.gastoken,
        taskArgs.refundreceiver,
        taskArgs.signatures,
        { gasLimit: 200000 }
      );

      if (taskArgs.log)
        console.log(`\n txHash execTransaction: ${executeTx.hash}\n`);

      const executeTxReceipt = await executeTx.wait();

      if (taskArgs.log) {
        const executionSuccess = await run("event-getparsedlogs", {
          contractname: "IGnosisSafe",
          eventname: "ExecutionSuccess",
          txhash: executeTx.hash,
          blockhash: executeTxReceipt.blockHash
        });
        if (executionSuccess) console.log(`\n ExecutionSuccess ✅`);

        const executionFailure = await run("event-getparsedlogs", {
          contractname: "IGnosisSafe",
          eventname: "ExecutionFailure",
          txhash: executeTx.hash,
          blockhash: executeTxReceipt.blockHash
        });
        if (executionFailure) console.log(`\n ExecutionFailure ❌`);

        if (!executionSuccess && !executionFailure) {
          console.log(`
            \n🚫 Neither ExecutionSuccess or ExecutionFailure event logs where found\
            \n   executeTx: ${executeTxReceipt.hash}\n
          `);
        }
      }

      return executeTxReceipt.hash;
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
