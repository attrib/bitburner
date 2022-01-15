import { CCC } from "ccc/ccc.js"
import { setNS } from "ccc/NS"

/** @param {import("./..").NS} ns **/
export async function main(_ns) {
    setNS(_ns)
    const ccc = new CCC()
    await ccc.scan()
    ccc.recover()
    ccc.hwgw()
}