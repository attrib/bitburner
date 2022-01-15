import {deepScan, isHackable, maxNukeable, formatNumber, connectPath} from "/scripts/utils.js"

/** @param {NS} ns **/
export async function main(ns) {
	let flags = ns.flags([
		['all', false],
		['files', false],
		['backdoor', false],
		['names', false],
		['help', false]
	]);
	if (flags.help) {
		ns.tprint('Does a deep scan for all available servers and prints some info about the server')
		ns.tprint('--all : Shows all servers, default only shows nukeable and hackable servers')
		ns.tprint('--files : Shows only servers which have any file')
		ns.tprint('--backdoor : Only shows servers missing a backdoor (and are nukeable)')
		ns.tprint('--names : Only shows the name (single line info)')
		return
	}

	let allHosts = flags._.length === 0 ? deepScan(ns, ns.getHostname()) : flags._
	if (flags._.length > 0) {
		flags.all = true
	}

	let count = 0
	const maxNuke = maxNukeable(ns)
	for (let host of allHosts) {
		let server = ns.getServer(host)
		let rootAccess = server.hasAdminRights
		let nukeable = server.numOpenPortsRequired <= maxNuke
		let hackable = isHackable(ns, host)
		let files = ns.ls(host);
		files = files.filter((name) => { return !['scan-hack.js', 'hack.js', '/scripts/hack.js'].includes(name) })
		if (!flags.all && (!nukeable || !hackable)) {
			continue
		}
		if (flags['files'] && files.length === 0) {
			continue
		}
		if (flags['backdoor'] && (!nukeable || server.backdoorInstalled)) {
			continue
		}
		count++
		if (flags['names']) {
			ns.tprint(`${host} (Root ${rootAccess ? 'true' : 'false'}, ${connectPath(ns, host)})`)
			continue
		}

		ns.tprint(`${host}:`)
		ns.tprint(`\t${connectPath(ns, host)}`)		
		ns.tprint(`\tRoot: ${rootAccess ? 'true' : 'false'} | ${hackable ? 'hacking possible' : 'NOT HACKABLE'}`)
		if (!rootAccess) {
			ns.tprint(`\tNukable: ${nukeable ? 'true' : 'false'}`)
			ns.tprint(`\tPorts required: ${server.numOpenPortsRequired} / Min Hacking ${server.requiredHackingSkill}`)
		}
		ns.tprint(`\tBackdoor: ${server.backdoorInstalled ? 'true' : 'false'}`)
		ns.tprint(`\tMoney: ${formatNumber(ns, server.moneyAvailable)} / ${formatNumber(ns, server.moneyMax)}`)
		ns.tprint(`\tSecurity: ${server.hackDifficulty.toFixed(3)} / ${server.minDifficulty}`)
		ns.tprint(`\tRAM: ${server.ramUsed.toFixed(3)} / ${server.maxRam.toFixed(3)}`)
		if (files.length > 0) {
			ns.tprint(`\tFiles: ${files.join(', ')}`)
		}

		ns.tprint('')
		ns.tprint('')
	}
	ns.tprint(`Found ${count} servers`)
}

export function autocomplete(data, args) {
    return [...data.servers];
}