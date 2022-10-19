import { HexString } from 'aptos'
import { initStaker } from '../src/utils'

const main = async () => {
  const { staker } = await initStaker()
  const addTx = await staker.addValidator(
    new HexString(
      '0xb01016155ba21194d5fe5465c4cf1699b1136db3bb05649597903531670031d5209a20000ee46ac8965e64210f11e6ec'
    ).toUint8Array(),
    new HexString(
      '0xa78739ebd25420d142286bc1419cfb25133f3799cd585afeefdabf255cbc9d68ff1e972e1771af52812d18ac92ec36630d480ffaec0559783aed7ab7873ddd4ed249691473beae997bd8de41401d9ee8397fb2dbec2b8919eed17011ed087c7d'
    ).toUint8Array(),
    '',
    ''
  )
  console.log(addTx)
}

main()
