import { AptosClient, FaucetClient, MaybeHexString } from 'aptos'
import {
  AccountAddress,
  ChainId,
  EntryFunction,
  RawTransaction,
  TransactionPayload,
  TransactionPayloadEntryFunction
} from 'aptos/dist/transaction_builder/aptos_types'
import { IWallet } from './utils'
import { AptosCoin } from './types'
import { bcsSerializeStr, bcsSerializeUint64 } from 'aptos/dist/transaction_builder/bcs'

export interface StakerParams {
  aptosClient: AptosClient
  faucetClient: FaucetClient
  wallet: IWallet
  contractAddress: string
}

export class Staker {
  private aptosClient: AptosClient
  private faucetClient: FaucetClient
  private wallet: IWallet
  private contractAddress: string

  private constructor(params: StakerParams) {
    const { aptosClient, faucetClient, wallet, contractAddress } = params
    this.aptosClient = aptosClient
    this.faucetClient = faucetClient
    this.wallet = wallet
    this.contractAddress = contractAddress
  }

  public static async build(params: StakerParams): Promise<Staker> {
    return new Staker(params)
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

  // PAYLOADS
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
