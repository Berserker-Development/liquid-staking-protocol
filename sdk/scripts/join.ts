import { initStaker } from '../src/utils'

const main = async () => {
  const { staker } = await initStaker()
  const joinTx = await staker.join()
  console.log(joinTx)
}

main()
