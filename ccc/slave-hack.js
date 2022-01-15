/** @param {NS} ns **/
export async function main(ns) {
	let host = ns.args[0]
	let sleepTime = ns.args[1]
	await ns.sleep(sleepTime)
	await ns.hack(host)
}