module Staking::core {
    use aptos_framework::stake::{add_stake, initialize_validator, join_validator_set, unlock};
    use aptos_framework::managed_coin::{initialize};
    use aptos_framework::account;
    use aptos_framework::signer;
    use aptos_framework::coin;

    const CONSENSUS_PUBKEY: vector<u8> = x"8f5aa6e3af3ea5c417a2996d09837da6928d47360041f8ab44e682563f491173a76f68f12100a888d6b1adddda92cf09";
    const PROOF_OF_POSSESSTION: vector<u8> = x"a1e2d7fbac2c39e7444167037fcee7e4fed972c04669349e40e7393c4929a5ce85210e071dd1020d4062aa09d101144e139004575d1934932704a1034e4c86ba5e992e031c32de7ae77f87a474826847e19d3606f5302ef531f17ba07423da23";
    const NETWORK_ADDRESSESS: vector<u8> = x"934a395380a14d909c1bdf141a5c84710f797cbbde4cc83486aa2d6116ef2772";
    const FULLNODE_ADDRESSES: vector<u8> = x"9e2e97cb8b53e8b201823a85ad8366b6a452968c171d0504ed1ba0381a72c208";
    const COIN_NAME: vector<u8> = b"BERSERKER_COIN";
    const TICKER: vector<u8> = b"BSA";
    const DECIMALS: u8 = 6;

    struct BsAptos has key { }

    struct StakeVault has key {
        resource_addr: address,
        signer_cap: account::SignerCapability
    }

    /// INIT 
    public entry fun initialize_baptos(
        account: &signer,
        monitor_supply: bool) {
        initialize<BsAptos>(
            account, COIN_NAME, TICKER, DECIMALS, monitor_supply
        );
    }

    ///// VALIDATOR MANAGMENT
    entry fun add_validator(validator: &signer) {
        initialize_validator(
            validator, CONSENSUS_PUBKEY, PROOF_OF_POSSESSTION, NETWORK_ADDRESSESS, FULLNODE_ADDRESSES
        );
    }

    entry fun join(validator: &signer) {
        let validator_address = signer::address_of(validator);
        join_validator_set(validator, validator_address);
    }

    ///// STAKE MANAGMENT
    entry fun stake(account: &signer, amount: u64) {

        //transfer aptos to vault 

        //register acc to bAptos
        
        //mint bsAptos

        add_stake(account, amount);
    }

    entry fun unstake(account: &signer, amount: u64) {
        unlock(account, amount);
    }

    public entry fun register<BsAptos>(account: &signer) {
        coin::register<BsAptos>(account);
    }

#[test(source = @0xa11ce, destination = @0xb0b, mint_authority = @Staking)]
    public entry fun test_initialize_berserker_coin(
        source: signer,
        destination: signer,
        mint_authority: signer
    ) {
        let source_addr = signer::address_of(&source);
        let destination_addr = signer::address_of(&destination);
        let mint_authority_addr = signer::address_of(&mint_authority);
        aptos_framework::account::create_account_for_test(source_addr);
        aptos_framework::account::create_account_for_test(destination_addr);
        aptos_framework::account::create_account_for_test(mint_authority_addr);

        initialize<BsAptos>(
            &mint_authority,
            COIN_NAME,
            TICKER,
            DECIMALS,
            true
        );
        assert!(coin::is_coin_initialized<BsAptos>(), 0);

        coin::register<BsAptos>(&mint_authority);
        register<BsAptos>(&source);
        register<BsAptos>(&destination);

        // mint<BsAptos>(&mint_authority, source_addr, 50);
        // mint<BsAptos>(&mint_authority, destination_addr, 10);
        // assert!(coin::balance<BsAptos>(source_addr) == 50, 1);
        // assert!(coin::balance<BsAptos>(destination_addr) == 10, 2);

        // let supply = coin::supply<FakeMoney>();
        // assert!(option::is_some(&supply), 1);
        // assert!(option::extract(&mut supply) == 60, 2);

        // coin::transfer<FakeMoney>(&source, destination_addr, 10);
        // assert!(coin::balance<FakeMoney>(source_addr) == 40, 3);
        // assert!(coin::balance<FakeMoney>(destination_addr) == 20, 4);

        // coin::transfer<FakeMoney>(&source, signer::address_of(&mod_account), 40);
        // burn<FakeMoney>(&mod_account, 40);

        // assert!(coin::balance<FakeMoney>(source_addr) == 0, 1);

        // let new_supply = coin::supply<FakeMoney>();
        // assert!(option::extract(&mut new_supply) == 20, 2);
    }
}