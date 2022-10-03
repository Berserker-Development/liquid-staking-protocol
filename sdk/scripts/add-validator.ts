import { AptosClient, FaucetClient } from 'aptos'
import { FAUCET_URL, loadAdminFromConfig, TESTNET_URL, TestWallet } from '../src/utils'
import { Staker } from '../src/staker'

const main = async () => {
  const aptosClient = new AptosClient(TESTNET_URL)
  const faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
  const admin = await loadAdminFromConfig()
  const contractAddress = admin.toPrivateKeyObject().address as string
  const wallet = new TestWallet(admin, aptosClient)
  const staker = await Staker.build({ aptosClient, faucetClient, wallet, contractAddress })
  const addTx = await staker.addValidator()
  console.log(addTx)
}

main()
