import {compileAndDeploy, loadAdminFromConfig} from "../src/utils";

const main = async () => {
    const admin = await loadAdminFromConfig()
    await compileAndDeploy(admin)
}

main()