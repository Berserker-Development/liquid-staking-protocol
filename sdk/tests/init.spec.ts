import { AptosAccount, AptosClient, FaucetClient, HexString } from 'aptos'
import {
  compileAndDeploy,
  FAUCET_URL,
  getResourceAccountAddress,
  sleep,
  TESTNET_URL,
  TestWallet
} from '../src/utils'
import { Staker } from '../src/staker'
import assert from 'assert'
import { StakerParams, StakerResource } from '../src/interfaces'
import { Address } from '../src/types'

describe('Init staker', () => {
  let aptosClient: AptosClient
  let faucetClient: FaucetClient
  let staker: Staker
  let ADMIN: AptosAccount
  let contractAddress: Address

  before(async () => {
    aptosClient = new AptosClient(TESTNET_URL)
    faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)

    ADMIN = new AptosAccount()

    contractAddress = ADMIN.toPrivateKeyObject().address as Address
    await faucetClient.fundAccount(ADMIN.address(), 1_000_000_000)

    await sleep(1000)
    await compileAndDeploy(ADMIN)
    await sleep(1000)
  })

  it('build instance', async () => {
    const initParams: StakerParams = {
      aptosClient,
      faucetClient,
      wallet: new TestWallet(ADMIN, aptosClient),
      contractAddress
    }

    staker = await Staker.build(initParams)
  })
  it('init', async () => {
    const stakerFee: number = 100
    const hashIx = await staker.init(true, stakerFee)
    console.log('\x1b[33m Tx hash ', hashIx)
    const stakerResource: StakerResource = await staker.getStakerResource()

    assert(stakerResource.fee === stakerFee, 'Invalid staker fee')
    assert(
      stakerResource.stakerSignerCap.account ===
        '0x' + getResourceAccountAddress(new HexString(contractAddress), 'Staker'),
      'Invalid pda address'
    )
  })
})
