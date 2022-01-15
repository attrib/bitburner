import { deepScan, isHackable, nuke, connectPath, maxNukeable } from "/scripts/utils.js"

/** @param {NS} ns **/
export async function main(ns) {
	let allHosts = deepScan(ns, ns.getHostname())
	const maxNuke = maxNukeable(ns)
	const playerHacking = ns.getPlayer().hacking
	ns.tprint(`Nuke server with max open ports: ${maxNuke}`)

	let count = 0
	const nextUnlocks = []
	for (let host of allHosts) {
		if (!isHackable(ns, host, false)) {
			nextUnlocks.push({
				host: host,
				nuke: ns.getServerNumPortsRequired(host),
				hack: ns.getServerRequiredHackingLevel(host)
			})
			continue
		}
		// Nukeing done by CCC, but using this to know about backdoors
		// if (!ns.hasRootAccess(host)) {
		// 	if (nuke(ns, host)) {
		// 		ns.tprint(`Successfully hacked ${host}`)
		// 		count++
		// 	}
		// 	else {
		// 		continue
		// 	}
		// }
		if (!ns.getServer(host).backdoorInstalled && !ns.getServer(host).purchasedByPlayer) {
			ns.tprint(`Missing backdoor on ${host} - home; ${connectPath(ns, host)}; backdoor`)
		}
	}
	ns.tprint(`Hacked ${count} servers`)

	if (nextUnlocks.length > 0) {
		ns.tprint(``)
		ns.tprint(`Next servers to unlock:`)
		nextUnlocks.sort((a, b) => {
			if (a.nuke == b.nuke) {
				return a.hack - b.hack
			}
			return a.nuke - b.nuke
		})

		for (let i = 0; i < 3; i++) {
			if (nextUnlocks.length > i) {
				ns.tprint(`\t${nextUnlocks[i].host} | Hacking ${nextUnlocks[i].hack} (${nextUnlocks[i].hack - playerHacking}) | Nuke ${nextUnlocks[i].nuke} (${nextUnlocks[i].nuke - maxNuke})`)
			}
		}
	}
}