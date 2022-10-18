import { loadAdminFromConfig, unitTests } from '../src/utils'

const main = async () => {
  const admin = await loadAdminFromConfig()
  await unitTests(admin)
}

main()
