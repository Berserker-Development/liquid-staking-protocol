module Staking::core {
    use aptos_framework::stake::add_stake;

    const SEED: vector<u8> = b"STAKING";

    entry fun stake(account: &signer, amount: u64) {
        add_stake(account, amount);
    }
}