import {AptosClient, FaucetClient} from "aptos";
import {loadAdminFromConfig, TESTNET_URL, TestWallet} from "../src/utils";
import {FAUCET_URL} from "aptos/dist/util.test";
import {Staker} from "../src/staker";

const main = async () => {
    const aptosClient = new AptosClient(TESTNET_URL)
    const faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
    const admin = await loadAdminFromConfig()
    const contractAddress = admin.toPrivateKeyObject().address as string
    const wallet = new TestWallet(admin)
    const staker = await Staker.build({ aptosClient, faucetClient, wallet, contractAddress })
    let tx = await staker.stake(10);
    console.log(tx)
}

main()