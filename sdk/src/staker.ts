import { AptosClient, FaucetClient, HexString, MaybeHexString, TxnBuilderTypes, Types } from 'aptos'

import {
  AptosCoin,
  IWallet,
  StakerParams,
  StakerResource,
  StakingConfig,
  State,
  ValidatorSet
} from './interfaces'
import { sha3_256 } from 'js-sha3'
import { Address, RawTransaction as RawTxn, TransactionPayload } from './types'
import toHex from 'to-hex'
import { sleep, UnconnectedWallet } from './utils'

const { AccountAddress, ChainId, EntryFunction, TransactionPayloadEntryFunction, RawTransaction } =
  TxnBuilderTypes
const STAKER_SEED = 'Staker'

export class Staker {
  private aptosClient: AptosClient
  private faucetClient: FaucetClient
  private wallet: IWallet
  private contractAddress: Address
  private stakerResourceAddress: Address

  private constructor(params: StakerParams) {
    const { aptosClient, faucetClient, wallet, contractAddress } = params
    this.aptosClient = aptosClient
    this.faucetClient = faucetClient
    this.contractAddress = contractAddress
    this.wallet = wallet ?? new UnconnectedWallet()
    // TODO: calculating Resource account not work
    this.stakerResourceAddress = Staker.getResourceAccountAddress(
      new HexString(contractAddress),
      STAKER_SEED
    )
  }

  public static async build(params: StakerParams): Promise<Staker> {
    return new Staker(params)
  }

  public changeWallet(wallet: IWallet) {
    this.wallet = wallet
  }

  private static getResourceAccountAddress(address: HexString, seed: string) {
    const seedHex: string = toHex(seed)
    const addressArray: Uint8Array = address.toUint8Array()
    const seedArray: Uint8Array = Uint8Array.from(Buffer.from(seedHex, 'hex'))
    return sha3_256(new Uint8Array([...addressArray, ...seedArray]))
  }

  public async init(protocolFee: number) {
    const scriptFunctionPayload: Types.TransactionPayload = await this.initPayload(protocolFee)

    return await this.signAndSend(scriptFunctionPayload)
  }

  public async getRawTransaction(payload: TransactionPayload): Promise<RawTxn> {
    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
      this.aptosClient.getAccount(this.wallet.publicKey.address()),
      this.aptosClient.getChainId()
    ])

    return new RawTransaction(
      AccountAddress.fromHex(this.wallet.publicKey.address()), // from
      BigInt(sequenceNumber), // sequence number
      payload, // payload
      1000n, // max_gas_amount
      1n, // gas_unit_price
      BigInt(Math.floor(Date.now() / 1000) + 10), // expiration_time 10 seconds from now
      new ChainId(chainId) // chain_id
    )
  }

  async signAndSend(rawTx: Types.TransactionPayload) {
    if (!this.wallet) throw new Error('Wallet is not connected')

    const signedTxn: Uint8Array = await this.wallet.signTransaction(rawTx)
    const res = await this.aptosClient.submitSignedBCSTransaction(signedTxn)
    await sleep(2000)
    // await this.aptosClient.waitForTransaction(res.hash)
    return Promise.resolve(res.hash)
  }

  async multiSignAndSend(rawTxs: Types.TransactionPayload[]) {
    if (!this.wallet) throw new Error('Wallet is not connected')

    const signedTxns: Uint8Array[] = await this.wallet.signAllTransactions(rawTxs)

    const res = await Promise.all(signedTxns.map(txn => this.aptosClient.submitSignedBCSTransaction(txn)))
    await sleep(2000)
    return Promise.all(res.map(singleRes => Promise.resolve(singleRes.hash)))
  }

  public async faucet(address: MaybeHexString, amount: number) {
    await this.faucetClient.fundAccount(address, amount)
  }

  // SINGING
  public async stake(amount: number) {
    const scriptFunctionPayload: Types.TransactionPayload = await this.stakePayload(amount)
    return await this.signAndSend(scriptFunctionPayload)
  }

  public async unstake(amount: number) {
    const scriptFunctionPayload: Types.TransactionPayload = await this.unstakePayload(amount)
    return await this.signAndSend(scriptFunctionPayload)
  }

  public async claim() {
    const scriptFunctionPayload: Types.TransactionPayload = await this.claimPayload()
    return await this.signAndSend(scriptFunctionPayload)
  }

  public async unstakeAndClaim(amount: number) {
    const scriptFunctionPayloadUnstake: Types.TransactionPayload = await this.unstakePayload(amount)
    const scriptFunctionPayloadClaim: Types.TransactionPayload = await this.claimPayload()
    return await this.multiSignAndSend([scriptFunctionPayloadUnstake, scriptFunctionPayloadClaim])
  }

  public async addValidator() {
    const scriptFunctionPayload: Types.TransactionPayload = await this.addValidatorPayload()
    return await this.signAndSend(scriptFunctionPayload)
  }

  public async join() {
    const scriptFunctionPayload = await this.joinPayload()
    return await this.signAndSend(scriptFunctionPayload)
  }

  // QUERIES
  public async getState() {
    const rawState = (
      await this.aptosClient.getAccountResource(
        this.contractAddress,
        `${this.contractAddress}::core::State`
      )
    ).data as any
    const state: State = { stakerAddress: rawState.staker_address }

    this.stakerResourceAddress = state.stakerAddress
    return state
  }

  public async getAptosCoinBalance(address: MaybeHexString): Promise<number> {
    const testCoinStore = (await this.aptosClient.getAccountResource(
      address,
      '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    )) as any as AptosCoin
    const balance: string = testCoinStore.data.coin.value
    return Number.parseInt(balance)
  }

  public async getBsAptosCoinBalance(address: MaybeHexString): Promise<number> {
    const bsAptos = `${this.contractAddress}::berserker_coin::BsAptos`
    const testCoinStore = (await this.aptosClient.getAccountResource(
      address,
      `0x1::coin::CoinStore<${bsAptos}>`
    )) as any as AptosCoin
    const balance: string = testCoinStore.data.coin.value
    return Number.parseInt(balance)
  }

  public async getValidatorSet(): Promise<ValidatorSet> {
    return (await this.aptosClient.getAccountResource('0x1', `0x1::stake::ValidatorSet`))
      .data as ValidatorSet
  }

  async getStakerResource(): Promise<StakerResource> {
    const data = (
      await this.aptosClient.getAccountResource(
        this.stakerResourceAddress,
        `${this.contractAddress}::core::Staker`
      )
    ).data as any

    return {
      protocolFee: Number(data.protocol_fee),
      stakerSignerCap: data.staker_signer_cap
    }
  }

  public async getStakePool(owner: MaybeHexString) {
    return (await this.aptosClient.getAccountResource(owner, `0x1::stake::StakePool`)).data as any
  }

  public async getValidatorConfig(owner: MaybeHexString) {
    return (await this.aptosClient.getAccountResource(owner, `0x1::stake::ValidatorConfig`))
      .data as any
  }

  public async getStakingConfig() {
    return (await this.aptosClient.getAccountResource('0x1', '0x1::staking_config::StakingConfig'))
      .data as StakingConfig
  }

  public async getExchangeRate() {
    //TODO: Add implementation
    // berserker supply
  }

  // PAYLOADS
  public async initPayload(protocolFee: number): Promise<Types.TransactionPayload> {
    return {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::core::init`,
      type_arguments: [],
      arguments: [protocolFee]
    }
  }

  public async stakePayload(newValue: number): Promise<Types.TransactionPayload> {
    return {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::core::stake`,
      type_arguments: [],
      arguments: [newValue]
    }
  }

  public async unstakePayload(newValue: number): Promise<Types.TransactionPayload> {
    return {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::core::unstake`,
      type_arguments: [],
      arguments: [newValue]
    }
  }

  public async claimPayload(): Promise<Types.TransactionPayload> {
    return {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::core::claim`,
      type_arguments: [],
      arguments: []
    }
  }

  public async joinPayload(): Promise<Types.TransactionPayload> {
    return {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::core::join`,
      type_arguments: [],
      arguments: []
    }
  }

  public async addValidatorPayload(): Promise<Types.TransactionPayload> {
    return {
      type: 'entry_function_payload',
      function: `${this.contractAddress}::core::add_validator`,
      type_arguments: [],
      arguments: []
    }
  }
}
