import * as SHA3 from 'js-sha3'
import { sha3_256 } from 'js-sha3'
import base58 from 'bs58'
import { AptosAccount, AptosClient, FaucetClient, HexString } from 'aptos'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { promises as fsPromises } from 'fs'
import { AptosConfig, IWallet } from './interfaces'
import toHex from 'to-hex'
import { TransactionPayload, EntryFunctionPayload } from 'aptos/src/generated/index'
import { Staker } from './staker'

export const TESTNET_URL = 'https://fullnode.testnet.aptoslabs.com/v1'
//export const TESTNET_URL = 'https://rpc.aptos.nightly.app'
export const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com'
export const VALIDATOR_PUBKEY = '7a4b42b50d724ad70e4ea56c1e4d4c5c9cc94d56ad5b1690214ba84f39cea46e'
export const VALIDATOR_PRIVKEY =
  '0xb2e9ca5a61a842d75e29a5cb9cea053af9847f61e5abf2f4ff517d77ad066568'
const CONFIG_PATH = '../.aptos/config.yaml'
export const CONTRACT_ADDRESS = '0xa312f04ea0a5f73f9468ae22bf7a61477928b0cfcd2988c7d20f0c1ae22b1534'

export class TestWallet implements IWallet {
  account: AptosAccount
  publicKey: AptosPublicKey
  client: AptosClient

  constructor(account: AptosAccount, client: AptosClient) {
    this.account = account
    this.publicKey = new AptosPublicKey(account.pubKey().toString())
    this.client = client
  }

  async signTransaction(tx: TransactionPayload, max_gas_amount?: string): Promise<Uint8Array> {
    const rawTx = await this.client.generateTransaction(
      this.publicKey.address(),
      tx as EntryFunctionPayload,
      {
        max_gas_amount: max_gas_amount
      }
    )

    return await this.client.signTransaction(this.account, rawTx)
  }

  async signAllTransactions(txs: TransactionPayload[]): Promise<Uint8Array[]> {
    const [{ sequence_number: sequenceNumber }] = await Promise.all([
      this.client.getAccount(this.publicKey.address())
    ])

    return Promise.all(
      txs.map(async (tx, index) => {
        const rawTx = await this.client.generateTransaction(
          this.publicKey.address(),
          tx as EntryFunctionPayload,
          { sequence_number: Number(Number(sequenceNumber) + index).toString() }
        )
        return await this.client.signTransaction(this.account, rawTx)
      })
    )
  }
}

export class UnconnectedWallet implements IWallet {
  publicKey: AptosPublicKey

  constructor() {
    this.publicKey = new AptosPublicKey('0x')
  }

  async signTransaction(tx: TransactionPayload, max_gas_amount?: string): Promise<Uint8Array> {
    throw new Error('Unconnected wallet')
  }

  async signAllTransactions(txs: TransactionPayload[]): Promise<Uint8Array[]> {
    throw new Error('Unconnected wallet')
  }
}

export class AptosPublicKey {
  private readonly hexString: string

  static fromBase58(base58string: string) {
    const bytes = Buffer.from(base58.decode(base58string))
    const hexString = bytes.toString('hex')
    return new AptosPublicKey(hexString)
  }

  static default() {
    return new AptosPublicKey('0'.repeat(64))
  }

  address() {
    const hash = SHA3.sha3_256.create()
    hash.update(Buffer.from(this.asPureHex(), 'hex'))
    hash.update('\x00')
    return '0x' + hash.hex()
  }

  asUint8Array() {
    return new Uint8Array(Buffer.from(this.asPureHex(), 'hex'))
  }

  asString() {
    return this.hexString
  }

  asPureHex() {
    return this.hexString.substr(2)
  }

  constructor(hexString: string) {
    if (hexString.startsWith('0x')) {
      this.hexString = hexString
    } else {
      this.hexString = `0x${hexString}`
    }
  }
}

export const initStaker = async (): Promise<{ staker: Staker; admin: AptosAccount }> => {
  const aptosClient = new AptosClient(TESTNET_URL)
  const faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
  const admin = await loadAdminFromConfig()
  const contractAddress = admin.toPrivateKeyObject().address as string
  const wallet = new TestWallet(admin, aptosClient)
  console.log(`contract address: ${contractAddress.toString()}`)
  const staker = await Staker.build({ aptosClient, faucetClient, wallet, contractAddress })
  return { staker, admin }
}

export const getResourceAccountAddress = (address: HexString, seed: string) => {
  const seedHex: string = toHex(seed)
  const addressArray: Uint8Array = address.toUint8Array()
  const seedArray: Uint8Array = Uint8Array.from(Buffer.from(seedHex, 'hex'))
  const nonceArray: Uint8Array = Uint8Array.from(Buffer.from('ff', 'hex'))
  return sha3_256(new Uint8Array([...addressArray, ...seedArray, ...nonceArray]))
}

export const init = async (nodeUrl: string = TESTNET_URL, faucet: string = FAUCET_URL) => {
  console.log('init new keys...')

  const init = 'cd .. && aptos init' + ' --rest-url ' + nodeUrl + ' --faucet-url ' + faucet
  await execShellCommand(init)
}

export const compile = async (account: AptosAccount) => {
  console.log('compiling...')

  // compile
  const keyObject = account.toPrivateKeyObject()
  const compile = 'cd .. && aptos move compile --named-addresses ' + 'Staking=' + keyObject.address
  console.log(compile)
  await execShellCommand(compile)
}

export const compileAndDeploy = async (account: AptosAccount, url: string = TESTNET_URL) => {
  console.log('compiling and deploying...')

  // compile
  const keyObject = account.toPrivateKeyObject()
  const compile = 'cd .. && aptos move compile --named-addresses ' + 'Staking=' + keyObject.address
  await execShellCommand(compile)

  // deploy
  const deploy =
    'cd .. && aptos move publish --named-addresses ' +
    'Staking=' +
    keyObject.address +
    ' --private-key ' +
    keyObject.privateKeyHex +
    ' --url ' +
    url +
    ' --override-size-check' +
    ' --max-gas 1000000' +
    ' --included-artifacts none' +
    ' --gas-unit-price 100'
  await execShellCommand(deploy)
}

export const unitTests = async (account: AptosAccount) => {
  console.log('unit tests...')

  //unit test
  const keyObject = account.toPrivateKeyObject()

  const test = 'cd .. && aptos move test --named-addresses' + ' Staking=' + keyObject.address

  await execShellCommand(test)
}

function execShellCommand(cmd: string) {
  const exec = require('child_process').exec
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 500 }, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.warn(error)
        console.log(stdout)
      } else if (stdout) {
        console.log(stdout)
      } else {
        console.log(stderr)
      }
      resolve(!!stdout)
    })
  })
}

export const loadAdminFromConfig = async (): Promise<AptosAccount> => {
  const fileContents = await fsPromises.readFile(path.join(__dirname, CONFIG_PATH), {
    encoding: 'utf-8'
  })
  const config = yaml.load(fileContents) as AptosConfig
  return new AptosAccount(new HexString(config.profiles.default.private_key).toUint8Array())
}

export async function sleep(timeMs: number): Promise<null> {
  return new Promise(resolve => {
    setTimeout(resolve, timeMs)
  })
}
