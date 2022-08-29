module Staking::core {
    use aptos_framework::stake::{add_stake, initialize_validator, join_validator_set};
    use std::vector;

    const CONSENSUS_PUBKEY: vector<u8> = b"CONSENSUS_PUBKEY";
    const PROOF_OF_POSSESSTION: vector<u8> = b"PROOF_OF_POSSESSTION";
    const NETWORK_ADDRESSESS: vector<u8> = b"NETWORK_ADDRESSESS";
    const FULLNODE_ADDRESSES: vector<u8> = b"FULLNODE_ADDRESSES";

    entry fun add_validator(account: &signer) {
        initialize_validator(
            account, CONSENSUS_PUBKEY, PROOF_OF_POSSESSTION, NETWORK_ADDRESSESS, FULLNODE_ADDRESSES
        );
    }

    entry fun stake(account: &signer, amount: u64) {
        add_stake(account, amount);
    }

    entry fun join(account: &signer, pool_address: address) {
        join_validator_set(account, pool_address);
    }
}