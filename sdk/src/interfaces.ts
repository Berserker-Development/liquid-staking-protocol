import { AptosClient, BCS, FaucetClient } from 'aptos'
import { TransactionPayload } from 'aptos/src/generated/index'
import { AptosPublicKey } from './utils'
import { Address } from './types'

export interface AptosCoin {
  data: {
    coin: { value: string }
  }
}

export interface BsAptosCoin {
  data: {
    coin: { value: string }
  }
}

export interface State {
  stakerAddress: Address
}

export interface StakerResource {
  protocolFee: number
  stakerSignerCap: SignerCapability
}

export interface SignerCapability {
  account: Address
}

export interface StakingConfig {
  allow_validator_set_change: boolean
  maximum_stake: string
  minimum_stake: string
  recurring_lockup_duration_secs: string
  rewards_rate: string
  rewards_rate_denominator: string
  voting_power_increase_limit: string
}

export interface StakerParams {
  aptosClient: AptosClient
  faucetClient?: FaucetClient
  wallet?: IWallet
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

export const { bcsSerializeUint64, bcsSerializeBool } = BCS

export interface IWallet {
  signTransaction: (tx: TransactionPayload) => Promise<Uint8Array>
  signAllTransactions: (txs: TransactionPayload[]) => Promise<Uint8Array[]>
  publicKey: AptosPublicKey
}
