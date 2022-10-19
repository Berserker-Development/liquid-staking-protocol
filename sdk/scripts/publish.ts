import { compileAndDeploy, loadAdminFromConfig } from '../src/utils'

const main = async () => {
  //await init()
  const admin = await loadAdminFromConfig()

  console.log('ADMIN ', admin.address().toString())
  await compileAndDeploy(admin)
}

main()
