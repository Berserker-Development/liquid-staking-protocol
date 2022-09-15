import { AptosAccount, AptosClient, HexString, MaybeHexString } from 'aptos'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { promises as fsPromises } from 'fs'
import { RawTransaction } from 'aptos/dist/transaction_builder/aptos_types'

// export const TESTNET_URL = 'https://fullnode.devnet.aptoslabs.com/v1'
export const TESTNET_URL = 'http://rpc.aptos.nightly.app'
export const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com'
export const VALIDATOR_PUBKEY = '7a4b42b50d724ad70e4ea56c1e4d4c5c9cc94d56ad5b1690214ba84f39cea46e'
export const VALIDATOR_PRIVKEY =
  '0xb2e9ca5a61a842d75e29a5cb9cea053af9847f61e5abf2f4ff517d77ad066568'
const CONFIG_PATH = '../.aptos/config.yaml'

export interface AptosConfig {
  profiles: {
    default: {
      private_key: string
    }
  }
}

export interface IWallet {
  signTransaction: (tx: RawTransaction) => Promise<Uint8Array>
  signAllTransactions: (txs: RawTransaction[]) => Promise<Uint8Array[]>
  account: AptosAccount
}

export class TestWallet implements IWallet {
  account: AptosAccount

  constructor(account: AptosAccount) {
    this.account = account
  }

  signTransaction(tx: RawTransaction): Promise<Uint8Array> {
    return Promise.resolve(AptosClient.generateBCSTransaction(this.account, tx))
  }

  signAllTransactions(txs: RawTransaction[]): Promise<Uint8Array[]> {
    const signedTxs: Promise<Uint8Array[]> = Promise.all(
      txs.map(async tx => AptosClient.generateBCSTransaction(this.account, tx))
    )

    return signedTxs
  }
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
    url
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
