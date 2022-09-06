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
