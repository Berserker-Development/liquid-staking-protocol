import {initStaker, sleep} from '../src/utils'

const main = async () => {
  const { staker, admin } = await initStaker()
  const tx = await staker.init(0)
  console.log(tx)

  // TODO: tmp require to getState before get PDA resource
  await sleep(3000)
  await staker.getState()

  const stakerResource = await staker.getStakerResource();
  console.log(stakerResource)
}

main()
