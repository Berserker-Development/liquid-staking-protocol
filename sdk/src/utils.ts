import {AptosAccount, AptosClient, HexString, MaybeHexString} from 'aptos'
import * as yaml from 'js-yaml'
import * as path from 'path'
import {promises as fsPromises} from 'fs'
import {RawTransaction} from 'aptos/dist/transaction_builder/aptos_types'


export const TESTNET_URL = 'https://fullnode.devnet.aptoslabs.com/v1'
export const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com'
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

export const compileAndDeploy = async (account: AptosAccount, url: string = TESTNET_URL) => {
    console.log('compiling and deploying...')

    // compile
    const keyObject = account.toPrivateKeyObject()
    const compile =
        'cd .. && aptos move compile --named-addresses ' +
        'Staking=' +
        keyObject.address
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

function execShellCommand(cmd: string) {
    const exec = require('child_process').exec
    return new Promise((resolve, reject) => {
        exec(cmd, {maxBuffer: 1024 * 500}, (error: any, stdout: any, stderr: any) => {
            if (error) {
                console.warn(error)
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