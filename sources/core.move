module Staking::core {
    use aptos_framework::stake::{Self, join_validator_set, set_operator};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{AptosCoin};
    use aptos_framework::account;
    use std::signer;

    use Staking::berserker_coin::{Self, initialize_bsaptos, BsAptos};

    const CONSENSUS_PUBKEY: vector<u8> = x"8f5aa6e3af3ea5c417a2996d09837da6928d47360041f8ab44e682563f491173a76f68f12100a888d6b1adddda92cf09";
    const PROOF_OF_POSSESSTION: vector<u8> = x"a1e2d7fbac2c39e7444167037fcee7e4fed972c04669349e40e7393c4929a5ce85210e071dd1020d4062aa09d101144e139004575d1934932704a1034e4c86ba5e992e031c32de7ae77f87a474826847e19d3606f5302ef531f17ba07423da23";
    const NETWORK_ADDRESSESS: vector<u8> = x"934a395380a14d909c1bdf141a5c84710f797cbbde4cc83486aa2d6116ef2772";
    const FULLNODE_ADDRESSES: vector<u8> = x"9e2e97cb8b53e8b201823a85ad8366b6a452968c171d0504ed1ba0381a72c208";

    const STAKER_SEED: vector<u8> = b"Staker";
    const ADMIN_ADDRESS: address = @Staking;
    const DENOMINATOR: u128 = 100000000000; // 10^12
    /////ERRORS
    const STATE_ALREADY_INITIALIZED: u64 = 0;
    const COIN_ALREADY_INITIALIZED: u64 = 1;
    const DIVISION_BY_ZERO: u64 = 2;
    const INVALID_ADDRESS: u64 = 3;
    const INSUFFICIENT_AMOUNT: u64 = 4;

    struct State has key {
        staker_address: address
    }

    struct Staker has key {
        protocol_fee: u64,
        staker_signer_cap: account::SignerCapability
    }

    /// INIT
    public entry fun init(admin: &signer, monitor_supply: bool, protocol_fee: u64) {
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
            admin, &staker_signer, monitor_supply
        );

        // register coins to ressource account
        coin::register<AptosCoin>(&staker_signer);
        coin::register<BsAptos>(&staker_signer);
    }

    ///// VALIDATOR MANAGMENT
    public entry fun add_validator() acquires State, Staker {
        // TODO add validator params
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        // our validator // TODO use set of validator with uniqe pda
        stake::initialize_validator(
            &staker_signer, CONSENSUS_PUBKEY, PROOF_OF_POSSESSTION, NETWORK_ADDRESSESS, FULLNODE_ADDRESSES
        );

        // TODO add posibility to add external validator
        // stake::initialize_stake_owner
    }

    // public entry fun initaial_stake(validator: &signer, amount: u64) acquires State{
    //     let (min_stake, _) = staking_config::get_required_stake(&staking_config::get());
    //     assert!(amount >= min_stake, error::invalid_argument(INSUFFICIENT_AMOUNT));
    // }


    public entry fun set_operator_to_resource_account(validator: &signer) acquires State {
        let state = borrow_global<State>(ADMIN_ADDRESS);
        assert!(signer::address_of(validator) != state.staker_address, INVALID_ADDRESS);
        set_operator(validator, state.staker_address);
        
    }

    public entry fun set_operator_to_admin(admin: &signer) acquires State, Staker {
        assert!(signer::address_of(admin) == ADMIN_ADDRESS, INVALID_ADDRESS);
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);
        assert!(signer::address_of(admin) != state.staker_address, INVALID_ADDRESS);
        set_operator(&staker_signer, ADMIN_ADDRESS);
    }

    public entry fun join(validator: &signer) {
        let validator_address = signer::address_of(validator);
        join_validator_set(validator, validator_address);
    }

    ///// STAKE MANAGMENT
    public entry fun stake(account: &signer, aptos_amount: u64) acquires Staker, State {
        // check aptos balance

        // calc bsAptos amount
        let bs_aptos_amount = calculate_bsaptos_amount(aptos_amount);
        // 1 form pool // TODO
        //let from_pool = 0; //mocked
        // // 2 from mint

        //let _bs_aptos_amount = bs_aptos_amount - from_pool;
        
        



        // get staker signer
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        coin::transfer<AptosCoin>(account, state.staker_address, aptos_amount);
        stake::add_stake(&staker_signer, aptos_amount);


        if(!coin::is_account_registered<BsAptos>(signer::address_of(account))) {
            coin::register<BsAptos>(account);
        };
        berserker_coin::mint(&staker_signer, signer::address_of(account), bs_aptos_amount);
    }

    // TODO request unstake
    // TODO claim aptos after end of lockup 
    public entry fun unstake(account: &signer, bs_aptos_amount: u64) acquires Staker, State  {
        
        // that has to be done before burn
        let aptos_amount = bs_aptos_amount; // TODO IMPORTANT use this calculate_aptos_amount(bs_aptos_amount); instead of input !!!!

        // get staker signer
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        berserker_coin::burn(&staker_signer, account, bs_aptos_amount);

        // TODO add calim tracking
        coin::transfer<AptosCoin>(&staker_signer, signer::address_of(account), aptos_amount);
        stake::unlock(&staker_signer, aptos_amount);

    }

    // unstake request 

    // calim



    public fun get_all_aptos_under_control(): u64 acquires State, Staker{
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);
        let (active, inactive, pending_active, pending_inactive) = stake::get_stake(signer::address_of(&staker_signer));
        return active + inactive + pending_active + pending_inactive
    }

    ////// MATH

    // calculate berserker coin amount based on aptos coin amount
    // bsaptos = aptos_amount * bs_aptos_supply / controlled_aptos same as 
    // shares = amount_value * 1/share_price where 1/share_price=bs_aptos_supply/controlled_aptos

    public fun calculate_bsaptos_amount(aptos_amount: u64): u64 acquires State, Staker {
        if(berserker_coin::get_supply() == 0u64){
            return aptos_amount
        };
        calculate_proportion(
            aptos_amount,
            berserker_coin::get_supply(),
            get_all_aptos_under_control()
        )
    }

    // calculate aptos coin amount based on berserker coin amount
    // aptos = bs_aptos_amount * controlled_aptos /  bs_aptos_supply same as 
    // value  = shares * share_price where share_price=controlled_aptos/bs_aptos_supply

    public fun calculate_aptos_amount(bs_aptos_amount: u64): u64 acquires State, Staker {
        calculate_proportion(
            bs_aptos_amount,
            get_all_aptos_under_control(),
            berserker_coin::get_supply()  
        )
    }

    public fun calculate_proportion(shares: u64, total_value: u64, total_shares: u64 ): u64 {
        assert!(total_shares != 0u64, DIVISION_BY_ZERO);
        let result = (to_u128(shares) * to_u128(total_value) * DENOMINATOR) / (to_u128(total_shares) * DENOMINATOR);
        (result as u64)
    }

    fun to_u128(num: u64): u128 {
        (num as u128)
    }

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

    #[test(admin = @Staking, aptos_framework = @0x1, user = @0xa11ce)]
    public entry fun test_get_all_aptos_under_control(admin: &signer, user: &signer, aptos_framework: &signer) acquires State, Staker {   
        stake::initialize_for_test(aptos_framework);
        let protocol_fee = 1000;
        init(admin, true, protocol_fee);

        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(user);

        stake::mint(admin, 1000);
        stake::mint(user, 1000);
        add_validator();
        assert!(get_all_aptos_under_control() == 0, 0);
        stake(user, 100);
        assert!(get_all_aptos_under_control() == 100, 0); // TODO 
    }
    
    #[test_only]
    public entry fun set_coins_amounts(
        user: &signer,
        aptos_framework: &signer,
        aptos_amount: u64,
        bs_aptos_amount: u64
    ) acquires State, Staker {
        stake::initialize_for_test(aptos_framework);
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        // increase controlled aptos by mint aptos to staker and stake
        stake::mint(&staker_signer, aptos_amount);
        add_validator();
        stake::add_stake(&staker_signer, aptos_amount);

        // mint bs aptos to user
        account::create_account_for_test(signer::address_of(user));
        if(!coin::is_account_registered<BsAptos>(signer::address_of(user))) {
            coin::register<BsAptos>(user);
        };
        berserker_coin::mint(&staker_signer, signer::address_of(user), bs_aptos_amount);
    }

    #[test(admin = @Staking, aptos_framework = @0x1, user = @0x555,)]
    public entry fun test_calculate_bsaptos_amount_1(admin: &signer, aptos_framework: &signer, user: &signer,) acquires State, Staker  { 
        init(admin, true, 100);
        set_coins_amounts(user, aptos_framework, 100, 100);
        assert!(calculate_bsaptos_amount(100) == 100, 0);
    }

    #[test(admin = @Staking, aptos_framework = @0x1)]
    public entry fun test_calculate_bsaptos_amount_2(admin: &signer, aptos_framework: &signer) acquires State, Staker { 
        init(admin, true, 100);
        set_coins_amounts(admin, aptos_framework, 1000, 2000);
        assert!(calculate_bsaptos_amount(100) == 200, 0);
    }
    // // TODO check more cases

    #[test(admin = @Staking, aptos_framework = @0x1)]
    public entry fun test_calculate_aptos_amount_1(admin: &signer, aptos_framework: &signer) acquires State, Staker { 
        init(admin, true, 100);
        set_coins_amounts(admin, aptos_framework, 100, 100);
        assert!(calculate_aptos_amount(100) == 100, 0);
    }

    #[test(admin = @Staking, aptos_framework = @0x1)]
    public entry fun test_calculate_aptos_amount_2(admin: &signer, aptos_framework: &signer) acquires State, Staker { 
        init(admin, true, 100);
        set_coins_amounts(admin, aptos_framework, 1000, 2000);
        assert!(calculate_aptos_amount(100) == 50, 0);
    }
    // // TODO check more cases

    #[test]
    public entry fun test_calculate_proportion() {

        // sahres           1
        // total value      1
        // total shares     1
        // result
        // real 1 expected  1
    
        assert!(calculate_proportion(1,1,1) == 1, 0);

        // sahres           100
        // total value      1000
        // total shares     1100
        // result
        // real 90,909090 expected 90
    
        assert!(calculate_proportion(100,1000,1100) == 90, 0);

        // TODO check more cases
    }
}