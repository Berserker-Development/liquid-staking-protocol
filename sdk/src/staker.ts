import { AptosClient, FaucetClient, HexString, MaybeHexString } from 'aptos'
import {
  AccountAddress,
  ChainId,
  EntryFunction,
  RawTransaction,
  TransactionPayload,
  TransactionPayloadEntryFunction
} from 'aptos/dist/transaction_builder/aptos_types'

import { IWallet, StakerParams, StakerResource, ValidatorSet } from './interfaces'
import { AptosCoin } from './types'
import { bcsSerializeBool, bcsSerializeUint64 } from 'aptos/dist/transaction_builder/bcs'
import { Address } from 'aptos/dist/generated'
import { sha3_256 } from 'js-sha3'

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
    this.wallet = wallet
    this.contractAddress = contractAddress
    this.stakerResourceAddress = this.getResourceAccountAddress(
      new HexString(contractAddress),
      STAKER_SEED
    )
  }

  public static async build(params: StakerParams): Promise<Staker> {
    return new Staker(params)
  }

  private getResourceAccountAddress(address: HexString, seed: string) {
    const toHex = require('to-hex')
    const seedHex: string = toHex(seed)
    const addressArray: Uint8Array = address.toUint8Array()
    const seedArray: Uint8Array = Uint8Array.from(Buffer.from(seedHex, 'hex'))
    return sha3_256(new Uint8Array([...addressArray, ...seedArray]))
  }

  public async init(monitorSupply: boolean, amount: number) {
    const scriptFunctionPayload: TransactionPayloadEntryFunction = await this.initPayload(
      monitorSupply,
      amount
    )
    const rawTxn: RawTransaction = await this.getRawTransaction(scriptFunctionPayload)
    return await this.signAndSend(rawTxn)
  }

  public async getRawTransaction(payload: TransactionPayload): Promise<RawTransaction> {
    const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
      this.aptosClient.getAccount(this.wallet.account.address()),
      this.aptosClient.getChainId()
    ])

    const rawTxn: RawTransaction = new RawTransaction(
      AccountAddress.fromHex(this.wallet.account.address()), // from
      BigInt(sequenceNumber), // sequence number
      payload, // payload
      1000n, // max_gas_amount
      1n, // gas_unit_price
      BigInt(Math.floor(Date.now() / 1000) + 10), // expiration_time 10 seconds from now
      new ChainId(chainId) // chain_id
    )

    return rawTxn
  }

  async signAndSend(rawTx: RawTransaction) {
    const signedTxn: Uint8Array = await this.wallet.signTransaction(rawTx)
    const res = await this.aptosClient.submitSignedBCSTransaction(signedTxn)
    await this.aptosClient.waitForTransaction(res.hash)
    return Promise.resolve(res.hash)
  }

  public async faucet(address: MaybeHexString, amount: number) {
    await this.faucetClient.fundAccount(address, amount)
  }

  // SINGING
  public async stake(amount: number) {
    const scriptFunctionPayload: TransactionPayloadEntryFunction = await this.stakePayload(amount)
    const rawTxn: RawTransaction = await this.getRawTransaction(scriptFunctionPayload)
    return await this.signAndSend(rawTxn)
  }

  public async addValidator() {
    const scriptFunctionPayload: TransactionPayloadEntryFunction = await this.addValidatorPayload()
    const rawTxn: RawTransaction = await this.getRawTransaction(scriptFunctionPayload)
    return await this.signAndSend(rawTxn)
  }

  public async join() {
    const scriptFunctionPayload = await this.joinPayload()
    const rawTxn: RawTransaction = await this.getRawTransaction(scriptFunctionPayload)
    return await this.signAndSend(rawTxn)
  }

  // QUERIES
  public async getAptosCoinBalance(address: MaybeHexString): Promise<number> {
    const testCoinStore = (await this.aptosClient.getAccountResource(
      address,
      '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
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
      fee: Number(data.fee),
      stakerSignerCap: data.staker_signer_cap
    }
  }

  // PAYLOADS
  public async initPayload(
    monitorSupply: boolean,
    fee: number
  ): Promise<TransactionPayloadEntryFunction> {
    return new TransactionPayloadEntryFunction(
      EntryFunction.natural(
        `${this.contractAddress}::core`,
        'init',
        [],
        [bcsSerializeBool(monitorSupply), bcsSerializeUint64(fee)]
      )
    )
  }

  public async stakePayload(newValue: number): Promise<TransactionPayloadEntryFunction> {
    return new TransactionPayloadEntryFunction(
      EntryFunction.natural(
        `${this.contractAddress}::core`,
        'stake',
        [],
        [bcsSerializeUint64(newValue)]
      )
    )
  }

  public async joinPayload(): Promise<TransactionPayloadEntryFunction> {
    return new TransactionPayloadEntryFunction(
      EntryFunction.natural(`${this.contractAddress}::core`, 'join', [], [])
    )
  }

  public async addValidatorPayload() {
    return new TransactionPayloadEntryFunction(
      EntryFunction.natural(`${this.contractAddress}::core`, 'add_validator', [], [])
    )
  }
}
