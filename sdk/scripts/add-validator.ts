import { AptosAccount, AptosClient, BCS, FaucetClient, HexString } from 'aptos'
import { FAUCET_URL, loadAdminFromConfig, TESTNET_URL, TestWallet } from '../src/utils'
import { Staker } from '../src/staker'
const key =
  'be6ce583206240877740459deb96cf27211a4ae6ddf25e3540d2f94d958e805432af4f37ed73804c7ec73e153889ce3dd3ba929946d1a42eb82fda40a5136433'

const main = async () => {
  const aptosClient = new AptosClient(TESTNET_URL)
  const faucetClient = new FaucetClient(TESTNET_URL, 'FAUCET_URL')
  const admin = new AptosAccount(new HexString(key).toUint8Array())
  const contractAddress = admin.toPrivateKeyObject().address as string
  console.log(contractAddress)
  const wallet = new TestWallet(admin, aptosClient)
  const staker = await Staker.build({ aptosClient, faucetClient, wallet, contractAddress })
  const addTx = await staker.addValidator(
    new HexString(
      '0xb01016155ba21194d5fe5465c4cf1699b1136db3bb05649597903531670031d5209a20000ee46ac8965e64210f11e6ec'
    ).toUint8Array(),
    new HexString(
      '0xa78739ebd25420d142286bc1419cfb25133f3799cd585afeefdabf255cbc9d68ff1e972e1771af52812d18ac92ec36630d480ffaec0559783aed7ab7873ddd4ed249691473beae997bd8de41401d9ee8397fb2dbec2b8919eed17011ed087c7d'
    ).toUint8Array(),
    '',
    ''
  )

  console.log(addTx)
}

main()
