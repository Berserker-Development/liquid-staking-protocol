import { AptosClient, FaucetClient } from 'aptos'
import { loadAdminFromConfig, TESTNET_URL, FAUCET_URL, TestWallet } from '../src/utils'
import { Staker } from '../src/staker'

const main = async () => {
  const aptosClient = new AptosClient(TESTNET_URL)
  const faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
  const admin = await loadAdminFromConfig()
  const contractAddress = admin.toPrivateKeyObject().address as string
  const wallet = new TestWallet(admin, aptosClient)
  const staker = await Staker.build({ aptosClient, faucetClient, wallet, contractAddress })

  const balanceBefore = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance before = ${balanceBefore}`)

  let stakeTx = await staker.unstake(1_000_000)
  console.log(`stake tx hash: ${stakeTx}`)

  const claimTx = await staker.claim()
  console.log(`claim tx hash: ${claimTx}`)

  const balanceAfter = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance after = ${balanceAfter}`)
}

main()
