import { NS } from 'ccc/NS.js'

class Server {
    /** @type {String} host */
    host

    constructor(host) {
        this.host = host
    }

    get ramAvailable() {
        if (this.host === 'home') {
            return Math.max(0, NS.getServerMaxRam(this.host) - NS.getServerUsedRam(this.host) - 32)
        }
        return NS.getServerMaxRam(this.host) - NS.getServerUsedRam(this.host)
    }

    get ramMax() {
        return NS.getServerMaxRam(this.host)
    }

    get money() {
        return NS.getServerMoneyAvailable(this.host)
    }

    get currentSecurity() {
        return NS.getServerSecurityLevel(this.host)
    }
}

export class TargetServer extends Server {
    targetMoney

    runningExecutions = {
        weaken: 0,
        grow: 0,
        hack: 0,
        hswg: 0,
    }

    constructor(host) {
        super(host)
        this.targetMoney = Math.floor(this.maxMoney * 0.80)
    }

    get maxMoney() {
        return NS.getServerMaxMoney(this.host)
    }

    get targetSecurity() {
        // const skillMult = 1.75 * NS.getPlayer().hacking
        // const skillChance = (skillMult - NS.getServerMinSecurityLevel(this.host)) / skillMult
        // let security = Math.min(100 - 90 / (skillChance * NS.getPlayer().hacking_chance_mult), NS.getServerSecurityLevel(this.host))
        // security = Math.max(security, NS.getServerMinSecurityLevel(this.host) + 1).toFixed(2)
        // return security
        return NS.getServerMinSecurityLevel(this.host) + 5
    }

    get securityDiff() {
        return this.currentSecurity - this.targetSecurity
    }

    get threadsNeededGrow() {
        if (this.money > this.targetMoney) {
            return 0
        }
        return Math.ceil(NS.growthAnalyze(this.host, Math.min(this.targetMoney / this.money, 1000)))
    }

}

export class SlaveServer extends Server {
    /** @type {Command[]} */
    runningCommands = []
    cores = 1

    constructor(host) {
        super(host)
        this.cores = NS.getServer(this.host).cpuCores
    }

    async init() {
        if (this.host !== 'home') {
            let files = NS.ls('home', '/ccc/slave-')
            await NS.scp(files, this.host)
        }
        // kill the old hacking script
        if (NS.scriptRunning('/scripts/hack.js', this.host)) {
            NS.scriptKill('/scripts/hack.js', this.host)
        }
        NS.print(`Registered ${this.host} as slave with ${this.ramMax} GB`)
    }

    update() {
        this.runningCommands = this.runningCommands.filter((command) => {
            const running = NS.isRunning(command.path, this.host, ...command.args)
            if (!running) {
                command.targetServer.runningExecutions[command.command] -= command.execCounter
            }
            return running
        })
    }
}

export class Command {

    /** @type {int} */
    pid = 0

    /** @type {int} */
    finishTime = 0

    /**
     * @param {SlaveServer} slaveServer
     * @param {TargetServer} targetServer 
     * @param {string} command 
     * @param {array} args 
     * @param {int} threads 
     * @param {int} execCounter 
     */
    constructor(slaveServer, targetServer, command, threads, execCounter, sleepTime) {
        this.slaveServer = slaveServer
        this.targetServer = targetServer
        this.command = command
        this.path = `/ccc/slave-${command}.js`
        this.threads = threads
        this.execCounter = execCounter
        this.sleepTime = sleepTime
    }

    exec(hswg = false) {
        let duration = 10000
        if (this.command === 'grow') {
            duration = NS.getGrowTime(this.targetServer.host)
        }
        else if (this.command === 'hack') {
            duration = NS.getHackTime(this.targetServer.host)
        }
        else if (this.command === 'weaken') {
            duration = NS.getWeakenTime(this.targetServer.host)
        }
        this.finishTime = Math.ceil(Date.now() + duration + 500 + this.sleepTime)
        this.args = [this.targetServer.host, this.sleepTime, this.execCounter, this.finishTime]
        const pid = NS.exec(this.path, this.slaveServer.host, this.threads, ...this.args)
        if (pid > 0) {
            //NS.print(`Target ${targetServer.host} started ${command} in ${ns.tformat(sleepTime)} from ${this.host} with ${threads} threads (PID: ${pid})`)
            this.pid = pid
            if (hswg) {
                this.targetServer.runningExecutions.hswg = 1
            }
            else {
                this.slaveServer.runningCommands.push(this)
                this.targetServer.runningExecutions[this.command] += this.execCounter
            }
            return true
        }
        else {
            this.finishTime = 0
            NS.print(`Target ${this.targetServer.host} error starting ${this.command} from ${this.slaveServer.host} with ${this.threads} threads`)
            //NS.tprint(`Target ${targetServer.host} error starting ${command} in ${ns.tformat(sleepTime)} from ${this.host} with ${threads} threads - possible threads ${Math.floor(this.ramAvailable / NS.getScriptRam(path))}`)
            return false
        }
    }

    /**
     * 
     * @param {import("../.").ProcessInfo} process 
     * @param {SlaveServer} slave
     * @param {TargetServer[]} targetServers
     */
    static recoverFromProcessInfo(process, slave, targetServers) {
        const re = new RegExp(`/ccc/slave-(.+).js`, 'i');
        const matches = process.filename.match(re)
        if (matches) {
            const targetServerName = process.args[0]
            const targetServer = targetServers.find((server) => server.host === targetServerName)
            const commandName = matches[1]
            const sleepTime = process.args[1]
            const execCounter = process.args[2]
            const finishTime = process.args[3]
            const command = new Command(slave, targetServer, commandName, process.threads, execCounter, sleepTime)
            command.args = process.args
            command.pid = process.pid
            command.finishTime = finishTime
            if (sleepTime > 0) {
                targetServer.runningExecutions.hswg = 1
            }
            else {
                slave.runningCommands.push(command)
                targetServer.runningExecutions[commandName] += execCounter
            }
            return command
        }
        return null
    }

}