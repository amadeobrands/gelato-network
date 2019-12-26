import { task } from "@nomiclabs/buidler/config";

export default task("bre-config", "Return (or --log) BRE.config properties")
  .addFlag("addressbook", "Returns bre.config.networks.networkName.addressbook")
  .addOptionalParam(
    "addressbookcategory",
    "Returns bre.config.networks.networkName.addressbook.category"
  )
  .addOptionalParam(
    "addressbookentry",
    "Returns bre.config.networks.networkName.addressbook.category.entry"
  )
  .addFlag(
    "contracts",
    "Use with --networks for a list of contracts available for deployment on --networkname"
  )
  .addOptionalParam("contractname", "Use with [--networks] --deployments")
  .addFlag("defaultnetwork", "Config of default network")
  .addFlag(
    "deployments",
    "Use [with --networks] for an address book of deployed contract instances on [--networkname]"
  )
  .addFlag("log", "Logs return values to stdout")
  .addFlag("networks", "Config of networks")
  .addOptionalParam(
    "networkname",
    "Optional use with --networks to get info for a specific network"
  )
  .addFlag("paths", "config of paths")
  .addFlag("solc", "config of solidity compiler")
  .setAction(
    async ({
      addressbook,
      addressbookcategory,
      addressbookentry,
      contracts,
      contractname,
      defaultnetwork,
      deployments,
      log,
      networks,
      networkname,
      paths,
      solc
    }) => {
      try {
        const optionalReturnValues = [];

        if (defaultnetwork) optionalReturnValues.push(config.defaultNetwork);

        if (addressbook || contracts || deployments || networks) {
          const networkInfo = await run("bre-config:networks", {
            addressbook,
            addressbookcategory,
            addressbookentry,
            contracts,
            contractname,
            deployments,
            networkname
          });
          optionalReturnValues.push(networkInfo);
        }

        if (paths) optionalReturnValues.push(config.paths);

        if (solc) optionalReturnValues.push(config.solc);

        if (optionalReturnValues.length == 0) {
          if (log) console.log(config);
          return config;
        } else if (optionalReturnValues.length == 1) {
          if (log) console.log(optionalReturnValues[0]);
          return optionalReturnValues[0];
        }
        if (log) console.log(optionalReturnValues);
        return optionalReturnValues;
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    }
  );
