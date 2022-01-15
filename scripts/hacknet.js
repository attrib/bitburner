import { Hacknet } from "/ccc/hacknet.js"

/** @param {NS} ns **/
export async function main(ns) {
  const flags = ns.flags([
    ['money', 0.1]
  ])

  const hacknet = new Hacknet(ns)
  ns.tail()
  hacknet.buyBestUpgrade(flags.money * ns.getPlayer().money);
}