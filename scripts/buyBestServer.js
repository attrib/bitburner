import { formatNumber } from "scripts/utils.js"
import { CCC } from "ccc/ccc.js"

/** @param {import("./..").NS} ns **/
export async function main(ns) {
	const flags = ns.flags([
		['money', 0.2]
	])
	const limit = ns.getPurchasedServerLimit()
	let servers = ns.getPurchasedServers()
	ns.tail()
	ns.tprint(`server limit: ${limit}`)
	ns.tprint(`current server count: ${servers.length}`)

	CCC.ns = ns
	const ccc = new CCC()

	if (await ccc.buyServer(CCC.ns.getPlayer().money * flags.money, true)) {
		ns.tprint(`Purchased new server ${ns.getServerMaxRam(`slave-${servers.length}`)}`)
	}

	servers = ns.getPurchasedServers()
	if (servers.length > 0) {
		let minRAM = servers.reduce((previousValue, currentValue) => Math.min(previousValue, ns.getServerMaxRam(currentValue)), ns.getServerMaxRam(servers[0]))
		let maxRAM = servers.reduce((previousValue, currentValue) => Math.max(previousValue, ns.getServerMaxRam(currentValue)), 0)
		ns.tprint(`Min RAM: ${minRAM}`)
		ns.tprint(`Max RAM: ${maxRAM}`)
	}
}