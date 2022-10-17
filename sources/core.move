module Staking::core {
    use aptos_framework::stake::{Self, set_operator};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{AptosCoin};
    use aptos_framework::account;
    use aptos_framework::reconfiguration;

    use std::signer;
    use std::vector;
    use std::bcs;

    use aptos_std::simple_map::{Self, SimpleMap};

    use Staking::berserker_coin::{Self, initialize_bsaptos, BsAptos};

    const CONSENSUS_PUBKEY: vector<u8> = x"8fb3338680be5cb447fa552b2f9485c8a4930dadc8011d4ffdebf131d7f386e402ab71e119f667e4e8b662ed9425c8c6";
    const PROOF_OF_POSSESSTION: vector<u8> = x"81086e0b1c7b50ff02662e12c1f3799500ad3a6edd2c18dd8e177d4a0aec727c5eddd10eaa749a12edcbd6b5e5c4308800f34a5789dd9e5a1ca27a359d7462a939d6fb894ff0dcc72145981b184966ad8bba47367ac043efcd54ba0276ef4d78";
    const NETWORK_ADDRESSESS: vector<u8> = x"2834c889bd133f690823bb2d75b4af5b0d382c5684dbe9541071a4999f9fe629";
    const FULLNODE_ADDRESSES: vector<u8> = x"b0788a6717f7cb35cf0b0b3b6c6f69da4a542b5f45a4958a7c9d2a24c2c0ce63";

    const STAKER_SEED: vector<u8> = b"Staker";
    const ADMIN_ADDRESS: address = @Staking;
    const DENOMINATOR: u128 = 100000000000; // 10^12
    /////ERRORS
    const STATE_ALREADY_INITIALIZED: u64 = 0;
    const COIN_ALREADY_INITIALIZED: u64 = 1;
    const DIVISION_BY_ZERO: u64 = 2;
    const INVALID_ADDRESS: u64 = 3;
    const INSUFFICIENT_AMOUNT: u64 = 4;
    const TOO_EARLY_FOR_CLAIM: u64 = 5;

    struct State has key {
        staker_address: address
    }

    struct Claim has store, drop {
        aptos_amount: u64,
        epoch_index: u64
    }
    struct Validator has store, drop {
        validator_address: address,
        signer_cap: account::SignerCapability,
        current_stake: u64
        //TODO add index
    }

    struct Staker has key {
        protocol_fee: u64,
        staker_signer_cap: account::SignerCapability,
        pending_claims: SimpleMap<address, Claim>,
        claims_accumulator: u64,
        validators: vector<Validator>,
        validator_nounce: u64
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
            staker_signer_cap,
            pending_claims: simple_map::create<address, Claim>(),
            claims_accumulator: 0u64,
            validators: vector::empty<Validator>(),
            validator_nounce: 0u64
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
    public entry fun add_validator(
        consensus_pubkey: vector<u8>,
        proof_of_possession: vector<u8>,
        network_addresses: vector<u8>,
        fullnode_addresses: vector<u8>,
    ) acquires State, Staker {
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global_mut<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        /*  NORMAL FLOW
        // create seed to new validator resource account
        let bytes = bcs::to_bytes(&staker.validator_nounce); //TODO think about seed 
        staker.validator_nounce = staker.validator_nounce + 1;
        vector::append(&mut bytes, STAKER_SEED);

        // create valdator resource account
        let (validator_signer, validator_signer_cap) = account::create_resource_account(&staker_signer, bytes);
        coin::register<AptosCoin>(&validator_signer);

        vector::push_back(
            &mut staker.validators,
            Validator{
                address: signer::address_of(&validator_signer),
                validator_signer_cap,
                current_stake: 0
            }
        );

        stake::initialize_validator(
            &validator_signer, consensus_pubkey, proof_of_possession, network_addresses, fullnode_addresses
        );
        */

        // 

        ///////// TEMPORARY FLOW valdidator laready exists and we he to load and initalize_validator 
        let validator = vector::borrow( &staker.validators, 0);
        let validator_signer = account::create_signer_with_capability(&validator.signer_cap);

        stake::initialize_validator(
            &validator_signer, consensus_pubkey, proof_of_possession, network_addresses, fullnode_addresses
        );
        /////////////////////////////

        // TODO add posibility to add external validator
        // stake::initialize_stake_owner
    }
    
    // TODO remove validator

    ///// VALIDATOR MANAGMENT

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

    public entry fun join() acquires State, Staker {
        // get staker signer
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);

        // get validator signer
        let validator = vector::borrow(&staker.validators, 0); // instead of 0 choose validator
        let validator_signer = account::create_signer_with_capability(&validator.signer_cap);
        let validator_address = signer::address_of(&validator_signer);
        stake::join_validator_set(&validator_signer, validator_address);
    }

    ///// STAKE MANAGMENT
    public entry fun stake(account: &signer, aptos_amount: u64) acquires Staker, State {
        // check aptos balance

        // calc bsAptos amount
        let bs_aptos_amount = calculate_bsaptos_amount(aptos_amount);
        // 1 form pool // TODO
        let from_pool = 0; //mocked

        // 2 from mint

        let _bs_aptos_amount = bs_aptos_amount - from_pool;
        
        // get staker signer
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        // get validator signer
        let validator = vector::borrow(&staker.validators, 0); // instead of 0 choose validator
        let validator_signer = account::create_signer_with_capability(&validator.signer_cap);

        coin::transfer<AptosCoin>(account, signer::address_of(&validator_signer), aptos_amount);
        stake::add_stake(&validator_signer, aptos_amount);

        if(!coin::is_account_registered<BsAptos>(signer::address_of(account))) {
            coin::register<BsAptos>(account);
        };
        berserker_coin::mint(&staker_signer, signer::address_of(account), bs_aptos_amount);
    }

    public entry fun unstake(user: &signer, bs_aptos_amount: u64) acquires Staker, State  {
        
        // that has to be done before burn
        let aptos_amount = calculate_aptos_amount(bs_aptos_amount);

        // get staker signer
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global_mut<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        berserker_coin::burn(&staker_signer, user, bs_aptos_amount);
        
        let current_epoch_index = reconfiguration::current_epoch();
        // start tracking claim
        simple_map::add(
            &mut staker.pending_claims, 
            signer::address_of(user), 
            Claim{
                aptos_amount, 
                epoch_index: current_epoch_index
            }
        );

        // update cliam accumulator
        staker.claims_accumulator = staker.claims_accumulator + aptos_amount;

        let validator = vector::borrow(&staker.validators, 0); // instead of 0 choose validator
        let validator_signer = account::create_signer_with_capability(&validator.signer_cap);
        stake::unlock(&validator_signer, aptos_amount);

    }

    public entry fun claim(user: &signer) acquires Staker, State  {

        let user_address = signer::address_of(user);
        // get staker signer
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global_mut<Staker>(state.staker_address);
        let staker_signer = account::create_signer_with_capability(&staker.staker_signer_cap);

        // get current epoch
        let current_epoch_index = reconfiguration::current_epoch();
        let claim = simple_map::borrow(&staker.pending_claims, &user_address);

        assert!(claim.epoch_index > current_epoch_index, TOO_EARLY_FOR_CLAIM);
        let aptos_amount = claim.aptos_amount;

        // update cliam accumulator
        staker.claims_accumulator = staker.claims_accumulator - aptos_amount;

        // withdraw and return aptos to user
        stake::withdraw(&staker_signer, aptos_amount);
        coin::transfer<AptosCoin>(&staker_signer, user_address, aptos_amount);

        // stop tracking claim
        simple_map::remove(&mut staker.pending_claims, &user_address);
    }



    public fun get_all_aptos_under_control(): u64 acquires State, Staker{
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);

        // get validator signer
        let validator = vector::borrow(&staker.validators, 0); // instead of 0 choose validator
        let validator_signer = account::create_signer_with_capability(&validator.signer_cap);

        let (active, inactive, pending_active, pending_inactive) = stake::get_stake(signer::address_of(&validator_signer));
        // contorlled aptos - claims accumulator
        return active + inactive + pending_active + pending_inactive - staker.claims_accumulator
    }

    ////// MATH

    public fun calculate_bsaptos_amount(aptos_amount: u64): u64 acquires State, Staker {

        // calculate berserker coin amount based on aptos coin amount
        // bsaptos = aptos_amount * bs_aptos_supply / controlled_aptos same as 
        // shares = amount_value * 1/share_price where 1/share_price=bs_aptos_supply/controlled_aptos

        if(berserker_coin::get_supply() == 0u64){
            return aptos_amount
        };
        calculate_proportion(
            aptos_amount,
            berserker_coin::get_supply(),
            get_all_aptos_under_control()
        )
    }

    public fun calculate_aptos_amount(bs_aptos_amount: u64): u64 acquires State, Staker {

        // calculate aptos coin amount based on berserker coin amount
        // aptos = bs_aptos_amount * controlled_aptos /  bs_aptos_supply same as 
        // value  = shares * share_price where share_price=controlled_aptos/bs_aptos_supply

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

    fun get_staker_signer(): signer acquires State, Staker {
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        account::create_signer_with_capability(&staker.staker_signer_cap)
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
    public entry fun test_add_validator_and_join(admin: &signer, user: &signer, aptos_framework: &signer) acquires State, Staker {   
        stake::initialize_for_test(aptos_framework);
        let protocol_fee = 1000;


        init(admin, true, protocol_fee);

        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(user));
        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(user);

        stake::mint(admin, 1000);
        stake::mint(user, 1000);
        add_validator( CONSENSUS_PUBKEY, PROOF_OF_POSSESSTION, NETWORK_ADDRESSESS, FULLNODE_ADDRESSES);
        stake(user, 100);
        join()
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
        add_validator(CONSENSUS_PUBKEY, PROOF_OF_POSSESSTION, NETWORK_ADDRESSESS, FULLNODE_ADDRESSES);
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

        add_validator(CONSENSUS_PUBKEY, PROOF_OF_POSSESSTION, NETWORK_ADDRESSESS, FULLNODE_ADDRESSES);
        let state = borrow_global<State>(ADMIN_ADDRESS);
        let staker = borrow_global<Staker>(state.staker_address);
        let validator = vector::borrow(&staker.validators,0);
        let validator_signer = account::create_signer_with_capability(&validator.signer_cap);
        // increase controlled aptos by mint aptos to validator and stake
        stake::mint(&validator_signer, aptos_amount);
        stake::add_stake(&validator_signer, aptos_amount);

        // mint bs aptos to user
        account::create_account_for_test(signer::address_of(user));
        if(!coin::is_account_registered<BsAptos>(signer::address_of(user))) {
            coin::register<BsAptos>(user);
        };

        let staker_signer = get_staker_signer();
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

    // TODO add test cases with claims 
}