import {initStaker, sleep} from '../src/utils'

const main = async () => {
  const { staker } = await initStaker()
  const tx = await staker.init(0)
  console.log(tx)

  const stakerResource = await staker.getStakerResource();
  console.log(stakerResource)
}

main()
