/** @param {NS} ns **/
export function formatNumber(ns, money) {
	return ns.nFormat(money, '($0.000a)')
}

/** @param {NS} ns **/
export function deepScan(ns, current, clearCache = false) {
	if (clearCache) {
		cachedScan = {}
	}
	const allHosts = Object.keys(deepScanWithPath(ns, current))
	return allHosts.filter((host) => host !== 'darkweb' || ns.getPlayer().tor)
}

var cachedScan = {}

/**
 *  @param {NS} ns
 *  @param string current
 *	@return {object}
 **/
export function deepScanWithPath(ns, current, parent = '', path = []) {
	if (current in cachedScan) {
		return cachedScan
	}
	else {
		cachedScan[current] = path
	}
	let childs = ns.scan(current)
	for (let child of childs) {
		if (child === parent) {
			continue
		}
		if (child === 'darkweb' && !ns.getPlayer().tor) {
			continue
		}
		deepScanWithPath(ns, child, current, [...path, child])
	}
	return cachedScan;
}

/** @param {NS} ns **/
export function connectPath(ns, host) {
	const scanResult = deepScanWithPath(ns, ns.getHostname());
	if (host in scanResult) {
		return 'connect ' + scanResult[host].join('; connect ')
	}
	else {
		return '';
	}
}

/** @param {NS} ns **/
export function isHackable(ns, host, moneyCheck = true) {
	let nukeable = ns.getServerNumPortsRequired(host) <= maxNukeable(ns)
	let maxMoney = moneyCheck ? ns.getServerMaxMoney(host) : 1
	let hackable = ns.getPlayer().hacking >= ns.getServerRequiredHackingLevel(host)
	return nukeable && hackable && maxMoney > 0
}

/** @param {NS} ns **/
export function maxNukeable(ns) {
	let maxNukeable = 0;
	maxNukeable += ns.fileExists('BruteSSH.exe', 'home') ? 1 : 0;
	maxNukeable += ns.fileExists('FTPCrack.exe', 'home') ? 1 : 0;
	maxNukeable += ns.fileExists('relaySMTP.exe', 'home') ? 1 : 0;
	maxNukeable += ns.fileExists('HTTPWorm.exe', 'home') ? 1 : 0;
	maxNukeable += ns.fileExists('SQLInject.exe', 'home') ? 1 : 0;
	return maxNukeable
}

/** @param {NS} ns **/
export function nuke(ns, host) {
	let portsRequired = ns.getServerNumPortsRequired(host);
	if (portsRequired >= 1) {
		ns.brutessh(host)
	}
	if (portsRequired >= 2) {
		ns.ftpcrack(host)
	}
	if (portsRequired >= 3) {
		ns.relaysmtp(host)
	}
	if (portsRequired >= 4) {
		ns.httpworm(host)
	}
	if (portsRequired >= 5) {
		ns.sqlinject(host)
	}
	if (portsRequired > maxNukeable(ns)) {
		ns.tprint(host + ' has to high security level to nuke.')
		return false
	}
	ns.nuke(host)
	return true
}