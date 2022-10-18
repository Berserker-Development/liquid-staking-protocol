import { initStaker } from '../src/utils'
import { ValidatorSet } from '../src/interfaces'

const main = async () => {
  const { staker } = await initStaker()
  const validatorSet: ValidatorSet = await staker.getValidatorSet()
  const addresses = validatorSet.active_validators.map(validator => validator.addr)
  console.log(addresses)
  const stakingConfig = await staker.getStakingConfig()
  console.log(stakingConfig)
}

main()
