import { initStaker } from '../src/utils'

const main = async () => {
  const { staker, admin } = await initStaker()

  const balanceBefore = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance before = ${balanceBefore}`)

  const tx = await staker.unstakeAndClaim(1_000_000)
  console.log(tx)

  const balanceAfter = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance after = ${balanceAfter}`)

  const diff = balanceAfter - balanceBefore
  console.log(`diff = ${diff}`)
}

main()
