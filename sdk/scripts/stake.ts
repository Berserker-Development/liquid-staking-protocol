import { initStaker } from '../src/utils'

const main = async () => {
  const { staker, admin } = await initStaker()

  const balanceBefore = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance before = ${balanceBefore}`)

  let tx = await staker.stake(1_000_000)
  console.log(tx)

  const balanceAfter = await staker.getAptosCoinBalance(admin.address())
  console.log(`balance after = ${balanceAfter}`)

  const bsAptosBalance = await staker.getBsAptosBalance(admin.address())
  console.log(`bsAptosBalance = ${bsAptosBalance}`)

  const allStakedAptos = await staker.getAllStakedAptos()
  console.log(`allStakedAptos = ${allStakedAptos}`)

  const bsAptosSupply = await staker.getBsAptosSupply();
  console.log(`bsAptosSupply = ${bsAptosSupply}`)

  const exchangeRate = await staker.getExchangeRate();
  console.log(`exchangeRate = ${exchangeRate}`)
}

main()
