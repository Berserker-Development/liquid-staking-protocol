import { AptosClient, FaucetClient } from 'aptos'
import { FAUCET_URL, loadAdminFromConfig, TESTNET_URL, TestWallet } from '../src/utils'
import { Staker } from '../src/staker'
import { ValidatorSet } from '../src/interfaces'

const main = async () => {
  const aptosClient = new AptosClient(TESTNET_URL)
  const faucetClient = new FaucetClient(TESTNET_URL, FAUCET_URL)
  const admin = await loadAdminFromConfig()
  const contractAddress = admin.toPrivateKeyObject().address as string
  const wallet = new TestWallet(admin)
  const staker = await Staker.build({ aptosClient, faucetClient, wallet, contractAddress })
  const validatorSet: ValidatorSet = await staker.getValidatorSet()
  const addresses = validatorSet.active_validators.map(validator => validator.addr)
  console.log(addresses)
  const stakingConfig = await staker.getStakingConfig()
  console.log(stakingConfig)
}

main()
