import { AptosAccount } from 'aptos'
import { compile } from '../src/utils'

const main = async () => {
  const admin = new AptosAccount()
  await compile(admin)
}

main()
