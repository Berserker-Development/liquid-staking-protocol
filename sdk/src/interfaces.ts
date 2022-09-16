import { AptosAccount, AptosClient, FaucetClient, HexString } from 'aptos'
import { Address } from 'aptos/dist/generated'
import { RawTransaction } from 'aptos/dist/transaction_builder/aptos_types'

export interface StakerResource {
  fee: number
  stakerSignerCap: SignerCapability
}

export interface SignerCapability {
  account: Address
}
export interface StakerParams {
  aptosClient: AptosClient
  faucetClient: FaucetClient
  wallet: IWallet
  contractAddress: Address
}

export interface ValidatorSet {
  active_validators: ActiveValidator[]
  consensus_scheme: number
  pending_active: []
  pending_inactive: []
  total_joining_power: string
  total_voting_power: string
}

export interface ActiveValidator {
  addr: string
  config: Config
  voting_power: string
}

export interface Config {
  consensus_pubkey: string
  fullnode_addresses: string
  network_addresses: string
  validator_index: string
}

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
