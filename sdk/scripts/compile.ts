import { compile, loadAdminFromConfig } from '../src/utils'

const main = async () => {
  const admin = await loadAdminFromConfig()
  await compile(admin)
}

main()
