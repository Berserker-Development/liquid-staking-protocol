module Staking::berserker_coin {
    use aptos_framework::coin::{Self, BurnCapability, FreezeCapability, MintCapability, supply};
    use aptos_framework::managed_coin::{Self}; //, register, burn};
    use aptos_framework::signer;
    use std::option;
    use std::string;


    const COIN_NAME: vector<u8> = b"Berserker coin";
    const TICKER: vector<u8> = b"BSA";
    const DECIMALS: u8 = 8;
    const MAX_U64: u64 = 18446744073709551615;

    struct BsAptos has key { }

    struct Capabilities<phantom CoinType> has key {
        burn_cap: BurnCapability<CoinType>,
        freeze_cap: FreezeCapability<CoinType>,
        mint_cap: MintCapability<CoinType>,
    }

    public fun initialize_bsaptos(
        account: &signer,
        capabilities_owner: &signer,
        monitor_supply: bool) {

        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<BsAptos>(
            account,
            string::utf8(COIN_NAME),
            string::utf8(TICKER),
            DECIMALS,
            monitor_supply,
        );

        move_to(capabilities_owner, Capabilities<BsAptos>{
            burn_cap,
            freeze_cap,
            mint_cap,
        });
        
    }

    public fun is_initialized(): bool {
        coin::is_coin_initialized<BsAptos>()
    }

    public fun get_supply(): u64 {
        let supply = &supply<BsAptos>();
        if (option::is_some(supply)) {
            (*option::borrow(supply) as u64)
        } else {
            0u64
        }
    }

    public fun mint(
        account: &signer,
        dst_addr: address,
        amount: u64,
    ) {
        assert!(get_supply() < MAX_U64, 0);
        managed_coin::mint<BsAptos>(account, dst_addr, amount);
    }

    #[test(admin = @Staking, mint_authority = @Staking)]
    public entry fun test_is_inittilaized(
        mint_authority: &signer,
        admin: &signer
    ) {
        assert!(!is_initialized(), 0);
        initialize_bsaptos(admin, mint_authority, true);
        assert!(is_initialized(), 0);
    }

    #[test(source = @0xa11ce, destination = @0xb0b, admin = @Staking, mint_authority = @0x6)]
    public entry fun test_berserker_coin(
        source: &signer,
        destination: &signer,
        admin: &signer,
        mint_authority: &signer
    ) {
        let source_addr = signer::address_of(source);
        let destination_addr = signer::address_of(destination);
        let _admin_addr = signer::address_of(admin);
        let mint_authority_addr = signer::address_of(mint_authority);
        aptos_framework::account::create_account_for_test(source_addr);
        aptos_framework::account::create_account_for_test(destination_addr);
        aptos_framework::account::create_account_for_test(mint_authority_addr);

        initialize_bsaptos(admin, mint_authority, true);
        // assert!(coin::is_coin_initialized<BsAptos>(), 0);

        // coin::register<BsAptos>(mint_authority);
        // register<BsAptos>(source);
        // register<BsAptos>(destination);

        // mint(mint_authority, source_addr, 50);
        // mint(mint_authority, destination_addr, 10);
        // assert!(coin::balance<BsAptos>(source_addr) == 50, 1);
        // assert!(coin::balance<BsAptos>(destination_addr) == 10, 2);

        // let supply = coin::supply<BsAptos>();
        // assert!(option::is_some(&supply), 1);
        // assert!(option::extract(&mut supply) == 60, 2);

        // coin::transfer<BsAptos>(source, destination_addr, 10);
        // assert!(coin::balance<BsAptos>(source_addr) == 40, 3);
        // assert!(coin::balance<BsAptos>(destination_addr) == 20, 4);

        // coin::transfer<BsAptos>(source, signer::address_of(mint_authority), 40);
        // burn<BsAptos>(mint_authority, 40);

        // assert!(coin::balance<BsAptos>(source_addr) == 0, 1);

        // let new_supply = coin::supply<BsAptos>();
        // assert!(option::extract(&mut new_supply) == 20, 2);
    }
}
