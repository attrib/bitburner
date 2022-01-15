import { formatNumber } from "/scripts/utils.js"

export class Hacknet {

    /** @type {import("../.").NS} */
    ns
    /** @type {import("../.").Hacknet} */
    hacknet
    mult = 1

    constructor(ns) {
        this.ns = ns
        this.hacknet = ns.hacknet
        this.mult = ns.getPlayer().hacknet_node_money_mult
    }

    calcProduction(level, ram, cores) {
        const levelMult = level * 1.5;
        const ramMult = Math.pow(1.035, ram - 1);
        const coresMult = (cores + 5) / 6;
        return levelMult * ramMult * coresMult * this.mult
    }

    buyBestUpgrade(moneyLimit) {
        if (this.hacknet.numNodes() === 0) {
            if (moneyLimit < 10000) {
                return false
            }
            this.ns.tprint('Fresh start, buying first two hacknet servers to script to work')
            this.hacknet.purchaseNode()
            this.hacknet.upgradeLevel(0, 9)
            this.hacknet.purchaseNode()
            return true
        }
        let moneyMade = 0
        for (let i = 0; i < this.hacknet.numNodes(); i++) {
            moneyMade += this.hacknet.getNodeStats(i).totalProduction
        }
        moneyLimit = this.hacknet.numNodes() > 5 ? Math.min(moneyMade, moneyLimit) : moneyLimit

        const upgradesBought = {
            node: 0,
            level: 0,
            ram: 0,
            core: 0,
            breakEven: 0,
            bought: 0,
        }
        let running = true
        while (running) {
            const nodeStatsCur = this.hacknet.getNodeStats(0)
            const lastNodeIndex = Math.max(0, this.hacknet.numNodes() - 1)
            const numNodes = Math.max(1, this.hacknet.numNodes() - 1) // last node is always 1 to calulate new node costs
            const ramUpgrades = Math.round(Math.log(nodeStatsCur.ram) / Math.LN2)

            const upgrades = [];

            let price = this.hacknet.getLevelUpgradeCost(lastNodeIndex, nodeStatsCur.level - 1)
            price += this.hacknet.getRamUpgradeCost(lastNodeIndex, ramUpgrades)
            price += this.hacknet.getCoreUpgradeCost(lastNodeIndex, nodeStatsCur.cores - 1)
            price += this.hacknet.getPurchaseNodeCost()
            let production = nodeStatsCur.production
            if (moneyLimit > price && numNodes <= 20) {
                upgrades.push({ price, production, ratio: production / price, type: 'node' })
            }

            price = this.hacknet.getLevelUpgradeCost(0, 10) * numNodes;
            if (moneyLimit > price) {
                production = (this.calcProduction(nodeStatsCur.level + 10, Math.pow(2, ramUpgrades), nodeStatsCur.cores) - nodeStatsCur.production) * numNodes
                upgrades.push({ price, production, ratio: production / price, type: 'level' })
            }


            price = this.hacknet.getRamUpgradeCost(0, 1) * numNodes;
            if (moneyLimit > price) {
                production = (this.calcProduction(nodeStatsCur.level, Math.pow(2, ramUpgrades + 1), nodeStatsCur.cores) - nodeStatsCur.production) * numNodes
                upgrades.push({ price, production, ratio: production / price, type: 'ram' })
            }

            price = this.hacknet.getCoreUpgradeCost(0, 1) * numNodes;
            if (moneyLimit > price) {
                production = (this.calcProduction(nodeStatsCur.level, Math.pow(2, ramUpgrades), nodeStatsCur.cores + 1) - nodeStatsCur.production) * numNodes
                upgrades.push({ price, production, ratio: production / price, type: 'cpu' })
            }

            upgrades.sort((a, b) => {
                return a.ratio - b.ratio
            })

            if (upgrades.length === 0) {
                break
            }
            const bestUpgrade = upgrades.pop()

            upgradesBought.breakEven += (bestUpgrade.price / (nodeStatsCur.production * numNodes + bestUpgrade.production)) * 1000
            switch (bestUpgrade.type) {
                case 'node':
                    this.hacknet.purchaseNode()
                    this.hacknet.upgradeLevel(numNodes, nodeStatsCur.level - 1)
                    this.hacknet.upgradeRam(numNodes, ramUpgrades)
                    this.hacknet.upgradeCore(numNodes, nodeStatsCur.cores - 1)
                    upgradesBought.node += 1
                    break;

                case 'level':
                    for (let i = 0; i < numNodes; i++) {
                        this.hacknet.upgradeLevel(i, 10)
                    }
                    upgradesBought.level += 10
                    break;

                case 'ram':
                    for (let i = 0; i < numNodes; i++) {
                        this.hacknet.upgradeRam(i, 1)
                    }
                    upgradesBought.ram += 1
                    break;

                case 'cpu':
                    for (let i = 0; i < numNodes; i++) {
                        this.hacknet.upgradeCore(i, 1)
                    }
                    upgradesBought.core += 1
                    break;
            }
            upgradesBought.bought++
            moneyLimit -= bestUpgrade.price
            if (moneyLimit <= 1000) {
                running = false
            }
        }

        if (upgradesBought.bought > 0) {
            this.ns.print(`Hacknet Upgrades (${upgradesBought.bought}):`)
            this.ns.print(`\tNodes: ${upgradesBought.node}`)
            this.ns.print(`\tLevels: ${upgradesBought.level}`)
            this.ns.print(`\tRAM levels: ${upgradesBought.ram}`)
            this.ns.print(`\tCPUs: ${upgradesBought.core}`)
            this.ns.print(`\tBreak Even after ${this.ns.tFormat(upgradesBought.breakEven)}`)
        }
        return upgradesBought.bought > 0
    }

}