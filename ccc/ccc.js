import { deepScan, isHackable, formatNumber, nuke, maxNukeable } from "scripts/utils.js"
import { Hacknet } from "ccc/hacknet.js"
import { TargetServer, SlaveServer, Command } from "ccc/Server"
import { NS, setNS } from "ccc/NS"

export class CCC {
	static commands = ['weaken', 'grow', 'hack']
	static scriptPath = '/ccc/'
	static LOW_MONEY_THRESHHOLD = 1e8 // after augment install faster startup

	currentMoney = 0
	ramCommand = {}
	/** @type {TargetServer[]} targetServers */
	targetServers = []
	/** @type {SlaveServer[]} slaveServers */
	slaveServers = []
	nextCommandEndTimestamp = []
	moreServersNeeded = 0
	hacknet
	lastServerPurchased
	nextContractsRun = 0

	constructor() {
		this.currentMoney = NS.getPlayer().money
		for (let command of CCC.commands) {
			this.ramCommand[command] = NS.getScriptRam(`${CCC.scriptPath}slave-${command}.js`)
		}
		this.hacknet = new Hacknet(NS)
	}

	async process() {
		await this.scan()
		await this.recover()
		while (1) {
			await this.scanNuke()
			let earning = Math.max(0, NS.getPlayer().money - this.currentMoney)
			if (earning > 0) {
				let serverBought = this.moreServersNeeded > 0 ? await this.buyServer(NS.getPlayer().money * 0.50) : false
				let hacknetBought = serverBought ? false : this.hacknet.buyBestUpgrade(this.currentMoney < CCC.LOW_MONEY_THRESHHOLD ? this.currentMoney * 0.2 : earning * 0.20)
				if (serverBought || hacknetBought) {
					this.currentMoney = NS.getPlayer().money
				}
			}

			for (let slave of this.slaveServers) {
				slave.update()
			}
			this.sortTargetServers()
			const hwgwTargets = []
			for (let targetServer of this.targetServers) {
				if ((targetServer.securityDiff - targetServer.runningExecutions.weaken) > 1) {
					this.execOnSlavesWeaken(targetServer, targetServer.securityDiff - targetServer.runningExecutions.weaken)
				}
				else if ((targetServer.threadsNeededGrow - targetServer.runningExecutions.grow) > 1) {
					const threadsNeeded = targetServer.threadsNeededGrow - targetServer.runningExecutions.grow
					this.execOnSlaves(targetServer, 'grow', threadsNeeded)
					this.execOnSlavesWeaken(targetServer, NS.growthAnalyzeSecurity(threadsNeeded))
				}
				else if (targetServer.runningExecutions.weaken < 1 && targetServer.runningExecutions.grow < 1 && targetServer.runningExecutions.hack < 1) {
					hwgwTargets.push(targetServer)
				}
			}

			if (hwgwTargets.length > 0) {
				hwgwTargets.sort((a, b) => b.maxMoney - a.maxMoney)
				while (await this.hwgw(hwgwTargets.shift())) {
					await NS.asleep(5) // get the ui a bit faster...
				}
			}

			for (let targetServer of this.targetServers) {
				if (targetServer.runningExecutions.weaken < 1 && targetServer.runningExecutions.grow < 1 && targetServer.runningExecutions.hack < 3 && targetServer.runningExecutions.hswg === 0) {
					let threadsNeededHack = Math.ceil(NS.hackAnalyzeThreads(targetServer.host, targetServer.money * 0.3))
					let threadsNeededGrow = Math.ceil(NS.growthAnalyze(targetServer.host, 1.45))

					this.execOnSlaves(targetServer, 'hack', threadsNeededHack)
					this.execOnSlaves(targetServer, 'grow', threadsNeededGrow)
					this.execOnSlavesWeaken(targetServer, NS.growthAnalyzeSecurity(threadsNeededGrow) + NS.hackAnalyzeSecurity(threadsNeededHack))
				}
			}

			// reset hwgw counter
			for (let targetServer of this.targetServers) {
				targetServer.runningExecutions.hswg = 0
			}


			// sleep for min execution time, min 1.5s, max 5m
			const now = (new Date()).getTime()
			this.nextCommandEndTimestamp = this.nextCommandEndTimestamp.filter((date) => date > now)
			this.nextCommandEndTimestamp.sort((a, b) => a - b)
			const sleepTime = Math.min(this.nextCommandEndTimestamp.length > 0 ? Math.max(1500, this.nextCommandEndTimestamp[0] - now) : 10000, 150000)
			if (sleepTime > 60000) {
				NS.print(`Next action in ${NS.tFormat(sleepTime)} (${this.nextCommandEndTimestamp.length > 0 ? NS.tFormat(this.nextCommandEndTimestamp[0] - now) : 'nothing executed?'})`)
			}
			this.runContracts()
			await NS.asleep(sleepTime)
		}
	}

	async scan() {
		const allHosts = deepScan(NS, 'home', true)
		for (let host of allHosts) {
			if (!NS.hasRootAccess(host)) {
				continue
			}
			await this.addHost(host)
		}
	}

	async scanNuke() {
		const allHosts = deepScan(NS, 'home', true)
		const nextUnlocks = []
		for (let host of allHosts) {
			if (isHackable(NS, host, false) && !NS.hasRootAccess(host)) {
				nuke(NS, host)
				await this.addHost(host)
			}
			else if (!isHackable(NS, host, false) && !NS.hasRootAccess(host)) {
				nextUnlocks.push({
					host: host,
					nuke: NS.getServerNumPortsRequired(host),
					hack: NS.getServerRequiredHackingLevel(host)
				})
			}
		}
		for (let host of NS.getPurchasedServers()) {
			const alreadyAdded = this.slaveServers.some((slave) => slave.host === host)
			if (!alreadyAdded) {
				this.moreServersNeeded = 0
				await this.addHost(host)
				this.lastServerPurchased = new Date()
			}
		}
		// if (nextUnlocks.length > 0) {
		// 	nextUnlocks.sort((a, b) => {
		// 		if (a.nuke == b.nuke) {
		// 			return a.hack - b.hack
		// 		}
		// 		return a.nuke - b.nuke
		// 	})
		// 	const nextUnlock = nextUnlocks[0]
		// 	if (nextUnlock.nuke - maxNukeable(NS) > 0) {
		// 		NS.tprint('Missing next exe to nuke next server')
		// 	}
		// }
	}

	/**
	 * 
	 * @param {TargetServer} targetServer 
	 */
	async hwgw(targetServer) {
		if (!(targetServer instanceof TargetServer)) {
			return false
		}
		let morePossible = false
		let waitCounter = 0
		this.sortSlaveServers()
		for (let slave of this.slaveServers) {
			const hackTime = NS.getHackTime(targetServer.host)
			const hackThreads = Math.max(1, Math.ceil(NS.hackAnalyzeThreads(targetServer.host, targetServer.targetMoney * 0.2)))
			const hackWeakenNeeded = NS.hackAnalyzeSecurity(hackThreads)

			const growTime = NS.getGrowTime(targetServer.host)
			const growThreads = Math.ceil(NS.growthAnalyze(targetServer.host, 1.28, slave.cores)) // 1 / 0.8 = 1.25 growth facter
			const growWeakenNeeded = NS.growthAnalyzeSecurity(growThreads)

			const weakenTime = NS.getWeakenTime(targetServer.host)
			const weakenThreadsGrow = this.weakenThreadsNeeded(slave, growWeakenNeeded) + 1
			const weakenThreadsHack = this.weakenThreadsNeeded(slave, hackWeakenNeeded) + 1

			const hackSleep = Math.ceil(weakenTime - hackTime - 250)
			const growSleep = Math.ceil(weakenTime - growTime + 250)
			const weakenSleep = Math.ceil(growSleep + growTime + 250 - weakenTime)
			const batchTime = Math.ceil(weakenSleep + weakenTime)
			const batchMemory = this.ramCommand['weaken'] * weakenThreadsGrow + this.ramCommand['weaken'] * weakenThreadsHack + this.ramCommand['hack'] * hackThreads + this.ramCommand['grow'] * growThreads

			if (batchMemory > slave.ramAvailable) {
				continue
			}

			const maxBatches = Math.max(0, Math.min(4, Math.floor(slave.ramAvailable / batchMemory)))
			for (let i = 0; i < maxBatches; i++) {
				if (batchMemory > slave.ramAvailable) {
					break
				}
				let command = new Command(slave, targetServer, 'weaken', weakenThreadsHack, NS.weakenAnalyze(weakenThreadsHack, slave.cores), i * 750)
				command.exec(true)
				command = new Command(slave, targetServer, 'weaken', weakenThreadsGrow, NS.weakenAnalyze(weakenThreadsGrow, slave.cores), i * 750 + weakenSleep)
				command.exec(true)
				command = new Command(slave, targetServer, 'grow', growThreads, growThreads, i * 750 + growSleep)
				command.exec(true)
				command = new Command(slave, targetServer, 'hack', hackThreads, hackThreads, i * 750 + hackSleep)
				command.exec(true)
				this.nextCommandEndTimestamp.push(command.finishTime)
				// if (i === 0) {
				// 	NS.print(`HWGW started against ${targetServer.host} from ${slave.host}`)
				// }
				waitCounter++
				if (waitCounter % 5 === 0) {
					await NS.asleep(5) // get the ui a bit faster...
				}
			}
			// still ram left, add more in next run. make sure next run is soon
			if (slave.ramAvailable > batchMemory) {
				this.nextCommandEndTimestamp.push(Date.now() + 1000)
				morePossible = true
			}
		}
		return morePossible
	}

	/**
	 * 
	 * @param {SlaveServer} slave 
	 */
	weakenThreadsNeeded(slave, weakenNeeded) {
		const coreBonus = 1 + (slave.cores - 1) / 16;
		// NS.weakenAnalyze = CONSTANTS.ServerWeakenAmount * threads * coreBonus
		return Math.max(1, Math.ceil(weakenNeeded / (0.05 * coreBonus))); // CONSTANTS.ServerWeakenAmount = 0.05
		// let threadCount = 1
		// while (weakenNeeded > NS.weakenAnalyze(threadCount, slave.cores)) {
		// 	threadCount++
		// }
		// return threadCount
	}

	execOnSlavesWeaken(targetServer, securityDiff) {
		const serverExec = []
		const command = 'weaken'
		this.sortSlaveServers()
		for (let slave of this.slaveServers) {
			if (securityDiff <= 0) {
				break
			}
			let maxThreads = Math.floor(slave.ramAvailable / this.ramCommand[command])
			if (maxThreads === 0) {
				continue
			}
			let threadCount = Math.min(maxThreads, this.weakenThreadsNeeded(slave, securityDiff))
			const weakenResult = NS.weakenAnalyze(threadCount, slave.cores)
			securityDiff -= weakenResult
			serverExec.push(new Command(slave, targetServer, command, threadCount, weakenResult, 0))
		}
		if (securityDiff > 0) {
			NS.print(`Target ${targetServer.host}: not enough servers to ${command}`)
			this.moreServersNeeded += this.weakenThreadsNeeded({ cores: 1 }, securityDiff) * this.ramCommand['weaken']
		}
		this.execArrayOnSlaves(serverExec)
	}

	execOnSlaves(targetServer, command, threadsNeeded) {
		const serverExec = []
		this.sortSlaveServers()

		for (let slave of this.slaveServers) {
			if (threadsNeeded <= 0) {
				break
			}
			let maxThreads = Math.floor(slave.ramAvailable / this.ramCommand[command])
			if (maxThreads === 0) {
				continue
			}
			let threadCount = Math.min(maxThreads, threadsNeeded)
			threadsNeeded -= threadCount
			serverExec.push(new Command(slave, targetServer, command, threadCount, threadCount, 0))
		}
		if (threadsNeeded > 1) {
			NS.print(`Target ${targetServer.host}: not enough servers to ${command} `)
			this.moreServersNeeded += this.ramCommand[command] * threadsNeeded
		}

		this.execArrayOnSlaves(serverExec)
	}

	/**
	 * 
	 * @param {TargetServer} targetServer 
	 * @param {Command[]} serverExec 
	 */
	execArrayOnSlaves(serverExec) {
		for (let cmd of serverExec) {
			if (cmd.exec()) {
				this.nextCommandEndTimestamp.push(cmd.finishTime)
			}
		}
	}

	sortTargetServers() {
		if (this.currentMoney < CCC.LOW_MONEY_THRESHHOLD) {
			NS.print(`Slow start sorting active`)
			this.targetServers.sort((a, b) => a.securityDiff - b.securityDiff)
		}
		else {
			this.targetServers.sort((a, b) => b.targetMoney - a.targetMoney)
		}
	}

	sortSlaveServers() {
		this.slaveServers.sort((a, b) => b.ramAvailable - a.ramAvailable)
	}

	async addHost(host) {
		if (isHackable(NS, host)) {
			this.targetServers.push(new TargetServer(host))
		}
		if ((NS.hasRootAccess(host) || isHackable(NS, host, false)) && NS.getServerMaxRam(host) > 1.75) {
			const slave = new SlaveServer(host)
			await slave.init()
			this.slaveServers.push(slave)
		}
	}

	async buyServer(maxMoney, noMax = false) {
		const limit = NS.getPurchasedServerLimit()
		const servers = NS.getPurchasedServers()

		// Only buy servers every 10m
		const now10minAgo = new Date()
		now10minAgo.setMinutes(now10minAgo.getMinutes() - 10)
		if (this.lastServerPurchased && now10minAgo < this.lastServerPurchased) {
			return false
		}

		let ramBuy = this.getHighestRam(maxMoney, Math.max(8, Math.floor(servers.length - 6)), noMax ? NS.getPurchasedServerMaxRam() : this.moreServersNeeded)
		if (ramBuy === false) {
			return false
		}
		let cost = NS.getPurchasedServerCost(ramBuy)
		if (maxMoney > cost && servers.length < limit) {
			const purchased = NS.purchaseServer(`slave-${servers.length}`, ramBuy)
			// error while purchasing
			if (purchased === "") {
				return false
			}
			await this.addHost(`slave-${servers.length}`)
			this.moreServersNeeded = 0
			this.lastServerPurchased = new Date()
			return true
		}
		if (servers.length === limit) {
			NS.tprint('Server limit reached')
		}

		return false
	}

	getHighestRam(maxMoney, minPow, maxRam) {
		minPow = Math.min(minPow, 19)
		let ramPow = minPow
		let ram, cost
		do {
			ramPow++
			ram = Math.pow(2, ramPow)
			cost = NS.getPurchasedServerCost(ram)
		} while (ram < NS.getPurchasedServerMaxRam() && maxMoney > cost && ram < maxRam)

		if (cost > maxMoney) {
			ramPow--
			if (ramPow === minPow) {
				return false
			}
			return Math.pow(2, ramPow)
		}

		return ram
	}

	runContracts() {
		const memContact = NS.getScriptRam('/scripts/contracts.js')
		if ((this.nextContractsRun === 0 || this.nextContractsRun >= Date.now()) && (NS.getServerMaxRam('home') - NS.getServerUsedRam('home')) >= memContact) {
			NS.print(`Run contracts`)
			NS.exec('/scripts/contracts.js', 'home', 1, '--auto')
			this.nextContractsRun = Date.now() + 30 * 60 // every 30 min
		}
	}

	exitCCC() {
		// for (let slave of this.slaveServers) {
		// 	//slave.update()
		// 	for (let cmd of slave.runningCommands) {
		// 		let suc = NS.kill(cmd.script, slave.host, ...cmd.args)
		// 		NS.print(`killed ${cmd.script} (${cmd.args}) on ${slave.host}  - ${suc}`)
		// 	}
		// }
		NS.toast('CCC stopped', 'error')
	}

	/**
	 * Recover from a run before (e.g. restart of game)
	 */
	async recover() {
		let counter = 0
		for (let slave of this.slaveServers) {
			for (let process of NS.ps(slave.host)) {
				const command = Command.recoverFromProcessInfo(process, slave, this.targetServers)
				if (command) {
					this.nextCommandEndTimestamp.push(command.finishTime)
				}
				counter++
				if (counter % 50 === 0) {
					await NS.asleep(5) // let others do their thing, otherwise ui blocks
				}
			}
		}
	}

}

/** @param {import("./..").NS} ns **/
export async function main(_ns) {
	setNS(_ns)
	const flags = NS.flags([
		['tail', false]
	])
	NS.disableLog('ALL')
	if (flags['tail']) {
		NS.tail()
	}
	const ccc = new CCC()
	NS.atExit(() => {
		ccc.exitCCC()
	})
	if (!NS.scriptRunning('/script/stock.js', 'home')) {
		NS.exec('/scripts/stock.js', 'home', 1);
	}
	await ccc.process()
}