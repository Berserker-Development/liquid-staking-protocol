import { initStaker } from '../src/utils'

const main = async () => {
  const { staker } = await initStaker()
  const addTx = await staker.addValidator()
  console.log(addTx)
}

main()
