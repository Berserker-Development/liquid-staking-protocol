import { AptosAccount, AptosClient, FaucetClient, HexString } from 'aptos'
import { FAUCET_URL, TESTNET_URL } from '../src/utils'
import { Staker } from '../src/staker'
import { Address } from '../src/types'
const key =
  'eacbe41015e72c131fccfaffbc091781ee3fa4263d72af9f35fee9dd941132c3419c06d3d2e449f35de2ff3a3638ed233421a1800c1c0976f30a51e2298a9b7d'

const main = async () => {
  let aptosClient: AptosClient
  let faucetClient: FaucetClient

  aptosClient = new AptosClient(TESTNET_URL)
  faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
  const privkey = new HexString(key)
  let account = new AptosAccount(privkey.toUint8Array())

  //console.log(account.address())
  const tx = await faucetClient.fundAccount(account.address(), 100_000_000)
}

main()
