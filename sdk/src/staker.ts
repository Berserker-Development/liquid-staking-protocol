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
  private faucetClient?: FaucetClient
  private wallet: IWallet
  private contractAddress: Address
  private stakerResourceAddress: Address

  private constructor(params: StakerParams) {
    const { aptosClient, faucetClient, wallet, contractAddress } = params
    this.aptosClient = aptosClient
    this.faucetClient = faucetClient
    this.contractAddress = contractAddress
    this.wallet = wallet ?? new UnconnectedWallet()
    this.stakerResourceAddress = Staker.calculateResourceAccountAddress(
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

  public changeFaucetClient(faucetClient: FaucetClient) {
    this.faucetClient = faucetClient
  }

  private static calculateResourceAccountAddress(address: HexString, seed: string) {
    const seedHex: string = toHex(seed)
    const addressArray: Uint8Array = address.toUint8Array()
    const seedArray: Uint8Array = Uint8Array.from(Buffer.from(seedHex, 'hex'))
    const nonceArray: Uint8Array = Uint8Array.from(Buffer.from('ff', 'hex'))
    return sha3_256(new Uint8Array([...addressArray, ...seedArray, ...nonceArray]))
  }

  public getResourceAccountAddress() {
    return this.stakerResourceAddress
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

    const res = await Promise.all(
      signedTxns.map(txn => this.aptosClient.submitSignedBCSTransaction(txn))
    )
    await sleep(2000)
    return Promise.all(res.map(singleRes => Promise.resolve(singleRes.hash)))
  }

  public async faucet(address: MaybeHexString, amount: number) {
    if (this.faucetClient === null || this.faucetClient === undefined) {
      throw new Error('Faucet not provider')
    }
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
  public async getAptosCoinBalance(address: MaybeHexString): Promise<number> {
    const aptosCoinStore = (await this.aptosClient.getAccountResource(
      address,
      '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    )) as any as AptosCoin
    const balance: string = aptosCoinStore.data.coin.value
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

    const pendingClaims = data.pending_claims.data.map(
      (entry: { key: string; value: { aptos_amount: string; epoch_index: string } }) => {
        return {
          address: entry.key,
          amount: Number(entry.value.aptos_amount),
          epoch: Number(entry.value.epoch_index)
        }
      }
    )

    return {
      protocolFee: Number(data.protocol_fee),
      stakerSignerCap: data.staker_signer_cap,
      pendingClaims
    }
  }

  public async getAllStakedAptos() {
    return this.getAptosCoinBalance(this.stakerResourceAddress)
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

  public async getBsAptosBalance(address: MaybeHexString): Promise<number> {
    const bsAptosCoinStore = (await this.aptosClient.getAccountResource(
      address,
      `0x1::coin::CoinStore<${this.contractAddress}::berserker_coin::BsAptos>`
    )) as any
    const balance: string = bsAptosCoinStore.data.coin.value
    return Number.parseInt(balance)
  }

  public async getBsAptosSupply(): Promise<number> {
    const rawData = (await this.aptosClient.getAccountResource(
      this.contractAddress,
      `0x1::coin::CoinInfo<${this.contractAddress}::berserker_coin::BsAptos>`
    )) as any
    const currentSupply = rawData.data.supply.vec[0].integer.vec[0].value
    return Number.parseInt(currentSupply)
  }

  public async getExchangeRate(): Promise<number> {
    // const exchangeRate = await this.getAllStakedAptos() / await this.getBsAptosSupply();
    // TODO: tmp optimize time
    return Promise.resolve(1)
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
