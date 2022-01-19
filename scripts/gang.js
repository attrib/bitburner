/** @type {import("../.").Gang} */
var gangNS
/** @type {import("../.").NS} */
var NS

/**
 * 
 * @param {import("../.").NS} ns 
 */
export async function main(ns) {
    const _gangNS = ns.gang
    gangNS = _gangNS
    NS = ns

    if (!gangNS.inGang()) {
        ns.tprint('Not in a gang, create a gang')
    }

    ns.disableLog('ALL')

    const gang = new Gang()
    await gang.process()

}

class Gang {

    /** @type {Task[]} */
    tasks = []
    /** @type {Member[]} */
    members = []

    constructor() {
        const tasks = gangNS.getTaskNames()
        for (let task of tasks) {
            this.tasks.push(new Task(task))
        }

        const members = gangNS.getMemberNames()
        for (let member of members) {
            this.members.push(new Member(member))
        }
    }

    async process() {
        while (1) {
            // Recruit members
            if (gangNS.canRecruitMember()) {
                const newMemberName = NS.sprintf('m%03i', this.members.length + 1)
                if (gangNS.recruitMember(newMemberName)) {
                    this.members.push(new Member(newMemberName))
                }
            }

            // Ascend members
            for (let member of this.members) {
                if (member.shouldAscend()) {
                    member.ascend()
                }
            }

            let minClashWins = 0
            let factionsAlive = 0
            const otherGangs = gangNS.getOtherGangInformation()
            for (let faction of Object.keys(otherGangs)) {
                const gangInfo = otherGangs[faction]
                if (faction === gangNS.getGangInformation().faction) {
                    continue
                }
                if (gangInfo.territory <= 0) {
                    continue
                }
                factionsAlive++
                const chance = this.power / (this.power + gangInfo.power)
                if (chance > 0.75) {
                    minClashWins++
                }
            }

            // Assign tasks members
            this.members.sort((a, b) => b.power - a.power)
            let territoryWarfare = Math.max(1, Math.floor(this.members.length * 0.25))
            if (factionsAlive === 0) {
                territoryWarfare = 0
            }
            let training = Math.max(1, Math.floor(this.members.length * 0.2))
            let counter = 0
            const openTaskMembers = this.members.slice(territoryWarfare, -1 * training)
            Task.setBestTask(this, this.tasks, openTaskMembers)
            for (let member of this.members) {
                if (territoryWarfare >= 1) {
                    territoryWarfare--
                    member.setTerritoryWarfare()
                }
                else if (this.members.length - counter - training <= 0) {
                    member.setTask(this.isHacking ? 'Train Hacking' : 'Train Combat')
                }
                counter++
            }

            // @todo equipment
            // territory warfare
            if (minClashWins >= factionsAlive * 0.5) {
                if (!this.territoryWarfareEngaged) {
                    NS.print('Engaging in Territory Warfare')
                }
                gangNS.setTerritoryWarfare(true)
            }
            else {
                if (this.territoryWarfareEngaged) {
                    NS.print('Stopping Territory Warfare')
                }
                gangNS.setTerritoryWarfare(false)
            }

            await NS.asleep(10000)
        }
    }

    get respect() {
        return gangNS.getGangInformation().respect
    }

    get wantedLevel() {
        return gangNS.getGangInformation().wantedLevel
    }

    get territory() {
        return gangNS.getGangInformation().territory
    }

    get isHacking() {
        return gangNS.getGangInformation().isHacking
    }

    get power() {
        return gangNS.getGangInformation().power
    }

    get territoryWarfareEngaged() {
        return gangNS.getGangInformation().territoryWarfareEngaged
    }

}

class Task {

    name
    /** @type {import("../.").GangTaskStats */
    stats

    constructor(name) {
        this.name = name
        this.stats = gangNS.getTaskStats(name)
    }

    /**
     * @param {Gang} gang 
     * @param {Member} member 
     * @param {string} type
     * @returns 
     */
    calculateGain(gang, member) {
        return {
            Respect: this.calculateWantedGain(gang, member),
            Money: this.calculateMoneyGain(gang, member),
            Wanted: this.calculateWantedGain(gang, member),
            taskName: this.name,
        }
    }

    /**
     * COPY OF formulas.calculateWantedPenalty
     * 
     * @param {Gang} gang 
     * @returns {number}
     */
    static calculateWantedPenalty(gang) {
        return gang.respect / (gang.respect + gang.wantedLevel);
    }

    static calculateWantedPenaltyAfter(gang, wanted, respectGain) {
        return (gang.respect + respectGain) / (gang.respect + gang.wantedLevel + wanted + respectGain);
    }

    /**
     * COPY OF formulas.calculateRespectGain
     * 
     * @param {Gang} gang 
     * @param {Member} member 
     * @returns {number}
     */
    calculateRespectGain(gang, member) {
        if (this.stats.baseRespect === 0) return 0;
        const mInfo = member.getInformation()
        let statWeight =
            (this.stats.hackWeight / 100) * mInfo.hack +
            (this.stats.strWeight / 100) * mInfo.str +
            (this.stats.defWeight / 100) * mInfo.def +
            (this.stats.dexWeight / 100) * mInfo.dex +
            (this.stats.agiWeight / 100) * mInfo.agi +
            (this.stats.chaWeight / 100) * mInfo.cha;
        statWeight -= 4 * this.stats.difficulty;
        if (statWeight <= 0) return 0;
        const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, this.stats.territory.respect) / 100);
        const territoryPenalty = (0.2 * gang.territory + 0.8); // * BitNodeMultipliers.GangSoftcap;
        if (isNaN(territoryMult) || territoryMult <= 0) return 0;
        const respectMult = Task.calculateWantedPenalty(gang);
        return Math.pow(11 * this.stats.baseRespect * statWeight * territoryMult * respectMult, territoryPenalty);
    }

    /**
     * COPY OF formulas.calculateWantedLevelGain
     * 
     * @param {Gang} gang 
     * @param {Member} member 
     * @returns {number}
     */
    calculateWantedGain(gang, member) {
        if (this.stats.baseWanted === 0) return 0;
        const mInfo = member.getInformation()
        let statWeight =
            (this.stats.hackWeight / 100) * mInfo.hack +
            (this.stats.strWeight / 100) * mInfo.str +
            (this.stats.defWeight / 100) * mInfo.def +
            (this.stats.dexWeight / 100) * mInfo.dex +
            (this.stats.agiWeight / 100) * mInfo.agi +
            (this.stats.chaWeight / 100) * mInfo.cha;
        statWeight -= 3.5 * this.stats.difficulty;
        if (statWeight <= 0) return 0;
        const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, this.stats.territory.wanted) / 100);
        if (isNaN(territoryMult) || territoryMult <= 0) return 0;
        if (this.stats.baseWanted < 0) {
            return 0.4 * this.stats.baseWanted * statWeight * territoryMult;
        }
        const calc = (7 * this.stats.baseWanted) / Math.pow(3 * statWeight * territoryMult, 0.8);

        // Put an arbitrary cap on this to prevent wanted level from rising too fast if the
        // denominator is very small. Might want to rethink formula later
        return Math.min(100, calc);
    }

    /**
     * COPY OF formulas.calculateMoneyGain
     * 
     * @param {Gang} gang 
     * @param {Member} member 
     * @returns {number}
     */
    calculateMoneyGain(gang, member) {
        if (this.stats.baseMoney === 0) return 0;
        const mInfo = member.getInformation()
        let statWeight =
            (this.stats.hackWeight / 100) * mInfo.hack +
            (this.stats.strWeight / 100) * mInfo.str +
            (this.stats.defWeight / 100) * mInfo.def +
            (this.stats.dexWeight / 100) * mInfo.dex +
            (this.stats.agiWeight / 100) * mInfo.agi +
            (this.stats.chaWeight / 100) * mInfo.cha;

        statWeight -= 3.2 * this.stats.difficulty;
        if (statWeight <= 0) return 0;
        const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, this.stats.territory.money) / 100);
        if (isNaN(territoryMult) || territoryMult <= 0) return 0;
        const respectMult = Task.calculateWantedPenalty(gang);
        const territoryPenalty = (0.2 * gang.territory + 0.8);// * BitNodeMultipliers.GangSoftcap;
        return Math.pow(5 * this.stats.baseMoney * statWeight * territoryMult * respectMult, territoryPenalty);
    }

    /**
     * 
     * @param {Gang} gang
     * @param {Task[]} tasks 
     * @param {string} type 
     * @param {Member[]} members 
     */
    static setBestTask(gang, tasks, members) {
        const openMembers = []
        for (let member of members) {
            if (member.power < 4) {
                member.setTask(gang.isHacking ? 'Train Hacking' : 'Train Combat')
            }
            else {
                openMembers.push(member)
            }
        }

        let wantedPenalty = Task.calculateWantedPenalty(gang)
        let wantedLevelChange = 0
        let respectGain = 0
        let type = 'Money'
        for (let member of openMembers) {
            let bestCalc = false
            for (let task of tasks) {
                if (wantedPenalty < 0.98 && task.stats.baseWanted > 0) {
                    continue
                }
                else if (wantedPenalty < 0.98 && task.stats.baseWanted < 0) {
                    const calculation = task.calculateGain(gang, member)
                    bestCalc = calculation
                    break
                }
                else if (wantedPenalty >= 0.98 && task.stats.baseWanted >= 0) {
                    const calculation = task.calculateGain(gang, member)
                    if (bestCalc === false || calculation[type] > bestCalc[type]) {
                        bestCalc = calculation
                    }
                }
            }
            if (bestCalc === false) {
                member.setTask(gang.isHacking ? 'Ransomware' : 'Mug People')
            }
            else {
                if (!bestCalc.taskName.startsWith('Train ')) {
                    type = type === 'Respect' ? 'Money' : 'Respect'
                }
                member.setTask(bestCalc.taskName)
                wantedLevelChange += bestCalc.Wanted
                respectGain += bestCalc.Respect
                wantedPenalty = Task.calculateWantedPenaltyAfter(gang, wantedLevelChange, respectGain)
            }
        }
    }
}

class Member {

    name

    constructor(name) {
        this.name = name
    }

    /**
     * 
     * @returns {import("../.").GangMemberInfo}
     */
    getInformation() {
        return gangNS.getMemberInformation(this.name)
    }

    get isIdle() {
        return this.getInformation().task === 'Unassigned'
    }

    get power() {
        const info = this.getInformation()
        return (info.hack + info.str + info.def + info.dex + info.agi + info.cha) / 95;
    }

    setTask(newTask) {
        if (newTask !== this.getInformation().task) {
            gangNS.setMemberTask(this.name, newTask)
            NS.print(`Changed task for ${this.name} to ${newTask}`)
        }

    }

    setTerritoryWarfare() {
        this.setTask('Territory Warfare')
    }

    shouldAscend() {
        const result = gangNS.getAscensionResult(this.name)
        if (result) {
            const multipler = result.hack + result.str + result.def + result.dex + result.agi + result.cha - 6
            if (multipler > 0.5) {
                return true
            }
        }
        return false
    }

    ascend() {
        gangNS.ascendMember(this.name)
        NS.print(`Ascending ${this.name}`)
    }

}