module Staking::core {
    use aptos_framework::stake::add_stake;

    entry fun stake(account: &signer, amount: u64) {
        add_stake(account, amount);
    }
}