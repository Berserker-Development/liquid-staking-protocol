import { initStaker } from '../src/utils'

const main = async () => {
  const { staker } = await initStaker()
  const tx = await staker.init(0)
  console.log(tx)
}

main()
