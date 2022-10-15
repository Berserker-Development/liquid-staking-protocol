import { initStaker } from '../src/utils'

const main = async () => {
  const { staker, admin } = await initStaker()

  const balanceBefore = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance before = ${balanceBefore}`)

  let stakeTx = await staker.unstake(1_000_000)
  console.log(`stake tx hash: ${stakeTx}`)

  const claimTx = await staker.claim()
  console.log(`claim tx hash: ${claimTx}`)

  const balanceAfter = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance after = ${balanceAfter}`)
}

main()
