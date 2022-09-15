module Staking::berserker_coin {
    use aptos_framework::coin;
    use aptos_framework::managed_coin::{initialize, register, mint, burn};
    use aptos_framework::signer;


    const COIN_NAME: vector<u8> = b"Berserker coin";
    const TICKER: vector<u8> = b"BSA";
    const DECIMALS: u8 = 8;

    struct BsAptos has key { }


    public fun initialize_bsaptos(
        account: &signer,
        monitor_supply: bool) {
        initialize<BsAptos>(
            account, COIN_NAME, TICKER, DECIMALS, monitor_supply
        );
    }

    public fun is_initialized(): bool {
        coin::is_coin_initialized<BsAptos>()
    }

    #[test( mint_authority = @Staking)]
    public entry fun test_is_inittilaized(
        mint_authority: &signer
    ) {
        assert!(!is_initialized(), 0);
        initialize_bsaptos(mint_authority, true);
        assert!(is_initialized(), 0);
    }

    #[test_only]
    use std::option;

    #[test(source = @0xa11ce, destination = @0xb0b, mint_authority = @Staking)]
    public entry fun test_berserker_coin(
        source: &signer,
        destination: &signer,
        mint_authority: &signer
    ) {
        let source_addr = signer::address_of(source);
        let destination_addr = signer::address_of(destination);
        let mint_authority_addr = signer::address_of(mint_authority);
        aptos_framework::account::create_account_for_test(source_addr);
        aptos_framework::account::create_account_for_test(destination_addr);
        aptos_framework::account::create_account_for_test(mint_authority_addr);

        initialize_bsaptos(mint_authority, true);
        assert!(coin::is_coin_initialized<BsAptos>(), 0);

        coin::register<BsAptos>(mint_authority);
        register<BsAptos>(source);
        register<BsAptos>(destination);

        mint<BsAptos>(mint_authority, source_addr, 50);
        mint<BsAptos>(mint_authority, destination_addr, 10);
        assert!(coin::balance<BsAptos>(source_addr) == 50, 1);
        assert!(coin::balance<BsAptos>(destination_addr) == 10, 2);

        let supply = coin::supply<BsAptos>();
        assert!(option::is_some(&supply), 1);
        assert!(option::extract(&mut supply) == 60, 2);

        coin::transfer<BsAptos>(source, destination_addr, 10);
        assert!(coin::balance<BsAptos>(source_addr) == 40, 3);
        assert!(coin::balance<BsAptos>(destination_addr) == 20, 4);

        coin::transfer<BsAptos>(source, signer::address_of(mint_authority), 40);
        burn<BsAptos>(mint_authority, 40);

        assert!(coin::balance<BsAptos>(source_addr) == 0, 1);

        let new_supply = coin::supply<BsAptos>();
        assert!(option::extract(&mut new_supply) == 20, 2);
    }
}
