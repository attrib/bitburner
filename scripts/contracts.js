import { deepScan } from "/scripts/utils.js"
import { solveI as AlgorithmicStockTraderI, solveII as AlgorithmicStockTraderII, solveIII as AlgorithmicStockTraderIII, solveIV as AlgorithmicStockTraderIV } from "/scripts/contracts/AlgorithmicStockTrader.js"
import { solve as GenerateIPAddresses } from "/scripts/contracts/GenerateIPAddresses.js"
import { solve as MergeOverlappingIntervals } from "/scripts/contracts/MergeOverlappingIntervals.js"
import { solve as SpiralizeMatrix } from "/scripts/contracts/SpiralizeMatrix.js"
import { solve as TotalWaystoSum } from "/scripts/contracts/TotalWaystoSum.js"
import { solve as UniquePathsinaGridI } from "/scripts/contracts/UniquePathsinaGridI.js"
import { solve as UniquePathsinaGridII } from "/scripts/contracts/UniquePathsinaGridII.js"
import { solve as ArrayJumpingGame } from "/scripts/contracts/ArrayJumpingGame.js"
import { solve as SanitizeParenthesesinExpression } from "/scripts/contracts/SanitizeParenthesesinExpression.js"
import { solve as FindLargestPrimeFactor } from "/scripts/contracts/FindLargestPrimeFactor.js"
import { solve as SubarraywithMaximumSum } from "/scripts/contracts/SubarraywithMaximumSum.js"
import { solve as FindAllValidMathExpressions } from "/scripts/contracts/FindAllValidMathExpressions.js"

class Contract {

    /** @type {import("./..").NS} */
    static ns
    filename
    host
    type
    data
    description
    triesRemaining

    constructor(filename, host) {
        this.filename = filename
        this.host = host
        this.data = Contract.ns.codingcontract.getData(this.filename, host);
        this.description = Contract.ns.codingcontract.getDescription(this.filename, host)
        this.type = Contract.ns.codingcontract.getContractType(this.filename, host).replaceAll(" ", "")
        this.triesRemaining = Contract.ns.codingcontract.getNumTriesRemaining(this.filename, host)
    }

}

/** @param {import("./..").NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['auto', false],
    ]);
    Contract.ns = ns
    const contracts = []
    const solver = {
        AlgorithmicStockTraderI: AlgorithmicStockTraderI,
        AlgorithmicStockTraderII: AlgorithmicStockTraderII,
        AlgorithmicStockTraderIII: AlgorithmicStockTraderIII,
        AlgorithmicStockTraderIV: AlgorithmicStockTraderIV,
        GenerateIPAddresses: GenerateIPAddresses,
        MergeOverlappingIntervals: MergeOverlappingIntervals,
        SpiralizeMatrix: SpiralizeMatrix,
        TotalWaystoSum: TotalWaystoSum,
        UniquePathsinaGridI: UniquePathsinaGridI,
        UniquePathsinaGridII: UniquePathsinaGridII,
        ArrayJumpingGame: ArrayJumpingGame,
        SanitizeParenthesesinExpression: SanitizeParenthesesinExpression,
        FindLargestPrimeFactor: FindLargestPrimeFactor,
        SubarraywithMaximumSum: SubarraywithMaximumSum,
        FindAllValidMathExpressions: FindAllValidMathExpressions,
    }
    for (let host of deepScan(ns, 'home')) {
        if (host === 'home') {
            continue
        }
        const contractFiles = ns.ls(host, '.cct')
        if (contractFiles.length > 0) {
            for (let contract of contractFiles) {
                contract = new Contract(contract, host)
                contracts.push(contract)
            }
        }
    }


    for (let contract of contracts) {
        if (contract.type in solver) {
            ns.print(`Found contract ${contract.type} on ${contract.host} (${contract.filename})`)
            const result = solver[contract.type](contract, ns)
            if (result === null) {
                ns.tprint(`No answer received for contract of type ${contract.type}`)
                continue
            }
            const reward = ns.codingcontract.attempt(result, contract.filename, contract.host, { returnReward: true })
            if (reward !== "") {
                ns.print(`Correct answer for contract: ${reward}`)
                //await ns.write(`/contract/${contract.filename.replace("'", "")}.txt`, reward, "w")
            }
            else {
                ns.tprint(`Wrong answer for contract: ${result}`)
                ns.tprint(`Left attemps: ${contract.triesRemaining - 1}`)
            }
        }
        else {
            ns.tprint(`Missing solver for ${contract.type}`)
        }
    }
}