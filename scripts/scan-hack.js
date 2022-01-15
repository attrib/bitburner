import { deepScan, isHackable, formatNumber } from "/scripts/utils.js"

/** @param {NS} ns **/
export async function main(ns) {
	ns.tprint('Please use ccc!')
	return
	const flags = ns.flags([
		['restart', false],
		['restartSlave', false],
	]);
	const currentHost = ns.getHostname()
	const hostnames = deepScan(ns, currentHost);
	const script = '/scripts/hack.js'
	const ramUsage = ns.getScriptRam(script, currentHost)
	const servers = []
	const threadsLocal = Math.floor((ns.getServerMaxRam(currentHost) - 64) / ramUsage)

	for (let hostname of hostnames) {
		if (!ns.hasRootAccess(hostname) || !isHackable(ns, hostname)) {
			continue;
		}

		let money = Math.floor(ns.getServerMaxMoney(hostname) * 0.80)

		// calculate security to reach around 90% hack chance
		const skillMult = 1.75 * ns.getPlayer().hacking
		const skillChance = (skillMult - ns.getServerMinSecurityLevel(hostname)) / skillMult
		let security = Math.min(100 - 90 / (skillChance * ns.getPlayer().hacking_chance_mult), ns.getServerSecurityLevel(hostname))
		security = Math.max(security, ns.getServerMinSecurityLevel(hostname) + 1).toFixed(2)
		const chance = (skillChance * (100 - security) / 100)

		// @todo: improve this shit!
		// rating is how often a growth needs to be called, how much money to get out if with with the current chance
		// divided by time in seconds to weaken the server
		const rating =
			((Math.log(money) - Math.log(ns.getServerMoneyAvailable(hostname))) / Math.log(1 + ns.getServerGrowth(hostname) / 100) * chance * money) /
			(Math.max(1, (Math.min(1, (ns.getServerSecurityLevel(hostname) - security) / ns.weakenAnalyze(threadsLocal)) * ns.getWeakenTime(hostname)) / 1000))

		// const rating = money

		servers.push({
			hostname,
			money,
			chance,
			security,
			rating
		})

		if (ns.scriptRunning(script, hostname)) {
			if (flags.restart) {
				ns.scriptKill(script, hostname)
			}
			else {
				ns.tprint(`Hacking already running on ${hostname}`)
				continue
			}
		}

		let ramAvail = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)
		let threads = Math.floor(ramAvail / ramUsage)
		if (threads === 0) {
			ns.tprint(`Not enough ram on ${hostname} - max ${ns.getServerMaxRam(hostname)}, used ${ns.getServerUsedRam(hostname)}, required ${ramUsage}`)
			continue
		}

		await ns.scp(script, hostname)
		ns.tprint(`Starting hacking ${hostname} with ${threads} threads, targeting ${ns.nFormat(money, '($0.000a)')} with security ${security} (${(chance * 100).toFixed(2)}%) - rating ${rating.toFixed(4)}`)
		let pid = ns.exec(script, hostname, threads, hostname, money, security)
		ns.tprint(`started with with pid ${pid}`)
	}
	servers.sort((a, b) => { return a.rating - b.rating })
	const bestServer = servers.pop()

	let start = true
	if (ns.scriptRunning(script, currentHost)) {
		const runningScript = ns.ps(currentHost).find((process) => { return process.filename === script })
		if (flags.restartSlave) {
			ns.scriptKill(script, currentHost)
		}
		else if (runningScript.args[0] !== bestServer.hostname) {
			//ns.scriptKill(script, currentHost)
			start = false
			ns.tprint(`BestServer changed from ${runningScript.args[0]} to ${bestServer.hostname}, maybe restart the script?`)
		}
		else {
			ns.tprint(`Hacking already running on ${currentHost}`)
			start = false
		}
	}
	if (start) {
		ns.tprint(`Hack locally ${bestServer.hostname} with ${threadsLocal}`)
		ns.exec(script, currentHost, threadsLocal, bestServer.hostname, bestServer.money, bestServer.security)
	}
	// @todo: add servers with maxmoney = 0, more power we can use :)
	for (let host of ns.getPurchasedServers()) {
		if (ns.scriptRunning(script, host)) {
			if (flags.restartSlave) {
				ns.scriptKill(script, host)
			}
			else {
				ns.tprint(`Hacking already running on ${host}`)
				continue
			}
		}

		let ramAvail = ns.getServerMaxRam(host) - ns.getServerUsedRam(host)
		let threads = Math.floor(ramAvail / ramUsage)
		if (threads === 0) {
			ns.tprint(`Not enough ram on ${host} - max ${ns.getServerMaxRam(host)}, used ${ns.getServerUsedRam(host)}, required ${ramUsage}`)
			continue
		}

		await ns.scp(script, host)
		ns.tprint(`Starting hacking ${bestServer.hostname} on ${host} with ${threads} threads, targeting ${ns.nFormat(bestServer.money, '($0.000a)')} with security ${bestServer.security} (${(bestServer.chance * 100).toFixed(2)}%)`)
		let pid = ns.exec(script, host, threads, bestServer.hostname, bestServer.money, bestServer.security)
		ns.tprint(`started with with pid ${pid}`)
	}
}