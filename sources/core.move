module Staking::core {
    use aptos_framework::stake::{add_stake, get_stake, initialize_validator, join_validator_set, unlock};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{AptosCoin};
    use aptos_framework::account;
    use aptos_framework::signer;

    use Staking::berserker_coin::{Self, initialize_bsaptos, BsAptos};

    const CONSENSUS_PUBKEY: vector<u8> = x"8f5aa6e3af3ea5c417a2996d09837da6928d47360041f8ab44e682563f491173a76f68f12100a888d6b1adddda92cf09";
    const PROOF_OF_POSSESSTION: vector<u8> = x"a1e2d7fbac2c39e7444167037fcee7e4fed972c04669349e40e7393c4929a5ce85210e071dd1020d4062aa09d101144e139004575d1934932704a1034e4c86ba5e992e031c32de7ae77f87a474826847e19d3606f5302ef531f17ba07423da23";
    const NETWORK_ADDRESSESS: vector<u8> = x"934a395380a14d909c1bdf141a5c84710f797cbbde4cc83486aa2d6116ef2772";
    const FULLNODE_ADDRESSES: vector<u8> = x"9e2e97cb8b53e8b201823a85ad8366b6a452968c171d0504ed1ba0381a72c208";

    const STAKER_SEED: vector<u8> = b"Staker";
    const ADMIN: address = @Staking;
    /////ERRORS
    const STATE_ALREADY_INITIALIZED: u64 = 0;
    const COIN_ALREADY_INITIALIZED: u64 = 1;

    struct State has key {
        staker_address: address
    }

    struct Staker has key {
        protocol_fee: u64,
        staker_signer_cap: account::SignerCapability
    }

    /// INIT
    entry fun init(admin: &signer, monitor_supply: bool, protocol_fee: u64) {
        assert!(!exists<State>(signer::address_of(admin)), STATE_ALREADY_INITIALIZED);
        assert!(!berserker_coin::is_initialized(), COIN_ALREADY_INITIALIZED);

        // create staker resource account
        let (staker_signer, staker_signer_cap) = account::create_resource_account(admin, STAKER_SEED);

        // init state
        move_to<State>(admin, State {
            staker_address: signer::address_of(&staker_signer)
        });
        
        // init staker resource
        move_to<Staker>(&staker_signer, Staker {
            protocol_fee,
            staker_signer_cap
        });


        // init berserker coin
        initialize_bsaptos(
            admin, monitor_supply
        );

        // register coins to ressource account
        coin::register<AptosCoin>(&staker_signer);
        coin::register<BsAptos>(&staker_signer);
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
    entry fun stake(account: &signer, aptos_amount: u64) {
        // calc bsAptos amount
        //let bs_aptos_amount = 
        // 1 form pool TODO

        // 2 from mint
           // check mint cap



        //transfer aptos to vault 

        //register acc to bAptos
        
        //mint bsAptos
        //mint()

        add_stake(account, aptos_amount);
    }
    // TODO request unstake
    // TODO claim aptos after end of lockup 
    entry fun unstake(account: &signer, amount: u64) {
        unlock(account, amount);
    }

    // unstake request 

    // calim



    public fun get_all_aptos_under_control(): u64 {

        let (active, inactive, pending_active, pending_inactive) = get_stake(ADMIN);
        return active + inactive + pending_active + pending_inactive
    }
    ////// MATH

    // // calculate berserker coin amount based on aptos coin amount
    // // bsaptos = aptos_amount * bs_aptos_supply / controlled_aptos same as 
    // // shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value

    // public fun calculate_bsaptos_amount(aptos_amount: u64): u128 {
    //     calculate_proportion(
    //         aptos_amount,
    //         berserker_coin::get_supply(),
    //         get_all_aptos_under_control()
    //     )
    // }

    // // calculate aptos coin amount based on berserker coin amount
    // // aptos = bs_aptos_amount * controlled_aptos /  bs_aptos_supply same as 
    // // value  = shares * share_price where share_price=total_value/total_shares

    // public fun calculate_aptos_amount(bs_aptos_amount: u64): u128 {
    //     if(!berserker_coin::get_supply()){
    //         return bs_aptos_amount
    //     }
    //     calculate_proportion(
    //         bs_aptos_amount,
    //         get_all_aptos_under_control(),
    //         berserker_coin::get_supply()  
    //     )
    // }

    // public fun calculate_proportion(value: u64, nominator: u128, denominator: u128 ): u128 {
    //     (value as u128) * nominator / denominator
    // }



    ////// TESTS

    #[test_only]
    use aptos_framework::coin::{is_account_registered};

    #[test(admin = @Staking)]
    public entry fun test_init(admin: &signer) acquires State, Staker {   
        let protocol_fee = 1000;
        init(admin, true, protocol_fee);
        let admin_address = signer::address_of(admin);
        let state = borrow_global<State>(admin_address);
        let staker = borrow_global<Staker>(state.staker_address);

        assert!(exists<State>(signer::address_of(admin)), 0);
        assert!(berserker_coin::is_initialized(), 0);
        assert!(exists<Staker>(state.staker_address), 0);
        assert!(staker.protocol_fee == 1000, 0);
        assert!(is_account_registered<AptosCoin>(state.staker_address), 0);
        assert!(is_account_registered<BsAptos>(state.staker_address), 0);
    }

    #[test_only]
    use aptos_framework::stake;
    use aptos_framework::managed_coin;

    #[test(admin = @Staking, aptos_framework = @0x1)]
    public entry fun test_get_all_aptos_under_control(admin: &signer, aptos_framework: &signer) {   
        stake::initialize_for_test(aptos_framework);

        account::create_account_for_test(signer::address_of(admin));
        coin::register<AptosCoin>(admin);

        stake::mint(admin, 1000);
        add_validator(admin);
        assert!(get_all_aptos_under_control() == 0, 0);
        stake(admin, 100);
        assert!(get_all_aptos_under_control() == 100, 0);
    }
    
    #[test_only]
    public entry fun set_coins_amounts(
        admin: &signer,
        aptos_framework: &signer,
        aptos_amount: u64,
        bs_aptos_amount: u64
    ) {   
        stake::initialize_for_test(aptos_framework);

        // increase controlled aptos
        account::create_account_for_test(signer::address_of(admin));
        coin::register<AptosCoin>(admin);
        stake::mint(admin, aptos_amount);
        add_validator(admin);
        stake(admin, aptos_amount);

        // mint bs aptos 
        let admin_address = signer::address_of(admin);
        managed_coin::mint<BsAptos>(admin, admin_address, bs_aptos_amount);
    }

    // #[test(admin = @Staking, aptos_framework = @0x1)]
    // public entry fun test_get_all_aptos_under_control(admin: &signer, aptos_framework: &signer) {   
    //     initialize_for_test(aptos_framework);

    //     account::create_account_for_test(signer::address_of(admin));
    //     coin::register<AptosCoin>(admin);

    //     stake::mint(admin, 1000);
    //     add_validator(admin);
    //     assert!(get_all_aptos_under_control() == 0, 0);
    //     stake(admin, 100);
    //     assert!(get_all_aptos_under_control() == 100, 0);
    // }



    // #[test]
    // public entry fun test_max() {
    //     // mint bs aptos 

    //     // increase controlled aptos 
        
    //     calculate_proportion()
    // }
}