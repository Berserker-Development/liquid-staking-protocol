import { AptosAccount, FaucetClient } from 'aptos'
import {
  compileAndDeploy,
  FAUCET_URL,
  init,
  loadAdminFromConfig,
  sleep,
  TESTNET_URL
} from '../src/utils'

const main = async () => {
  //await init()
  const admin = await loadAdminFromConfig()

  const faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
  await faucetClient.fundAccount(admin.address(), 1_000_000_000)
  await sleep(2000)
  console.log('ADMIN ', admin.address().toString())
  await compileAndDeploy(admin)
}

main()
