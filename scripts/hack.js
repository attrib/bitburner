/** @param {NS} ns **/
export async function main(ns) {
	let hostname = ns.args[0];
	let moneyTresh = ns.args[1]
	let secTresh = ns.args[2]	
	while (1) {
		if (ns.getServerSecurityLevel(hostname) > secTresh) {
			await ns.weaken(hostname);
		}
		else if (ns.getServerMoneyAvailable(hostname) < moneyTresh) {
			await ns.grow(hostname);
		}
		else {
			await ns.hack(hostname);
		}
	}
}