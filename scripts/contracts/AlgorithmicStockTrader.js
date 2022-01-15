/**
 * You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:
 *
 * 139,121,164,160,121,25,130,181,18,1,72,133,87,134,162
 * Determine the maximum possible profit you can earn using at most one transaction (i.e. you can only buy and sell the stock once). If no profit can be made then the answer should be 0. Note that you have to buy the stock before you can sell it
 */
export function solveI(contract, ns) {
    /** @type array */
    const data = contract.data
    let maxDiff = 0
    for (let day = 0; day < data.length; day++) {
        for (let day2 = day; day2 < data.length; day2++) {
            maxDiff = Math.max(maxDiff, data[day2] - data[day])
        }
    }
    return maxDiff
}

/**
 * You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:
 *
 * 17,169,147,32,20,67,79,114,179,31,140,161,68,83,103,14,130,98
 *
 * Determine the maximum possible profit you can earn using as many transactions as you'd like. 
 * A transaction is defined as buying and then selling one share of the stock. Note that you cannot engage in multiple transactions at once.
 * In other words, you must sell the stock before you buy it again.
 *
 * If no profit can be made, then the answer should be 0
 */
export function solveII(contract, ns) {
    /** @type array */
    const data = contract.data
    let max = 0
    let profit = 0
    let start = data.shift()
    for (let i = 0; i <= data.length; i++) {
        if (data[i] - start > max) {
            max = data[i] - start
        }
        else {
            start = data[i]
            profit += max
            ns.tprint(`${data[i - 1]}, ${data[i]} - +${max}=${profit}`)
            max = 0
        }
    }
    return profit
}

/**
 * You are given the following array of stock prices (which are numbers) where the i-th element represents the stock price on day i:
 *
 * 198,42,32,145
 *
 * Determine the maximum possible profit you can earn using at most two transactions. A transaction is defined as buying and then selling one share of the stock. Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you buy it again.
 *
 * If no profit can be made, then the answer should be 0
 */
export function solveIII(contract, ns) {
    /** @type array */
    const data = contract.data
    return getProfit(data, 2)
}

/**
 * You are given the following array with two elements:
 * 
 * [3, [66,160,122,145,199,195,15,195,163,138,30,48,163,102,21,27,168,73,68,119,164,99,18,4,46,160,14,8,59,188,44,15,38,145,141,67,129,132]]
 *
 * The first element is an integer k. The second element is an array of stock prices (which are numbers) where the i-th element represents the stock price on day i.
 *
 * Determine the maximum possible profit you can earn using at most k transactions. A transaction is defined as buying and then selling one share of the stock. Note that you cannot engage in multiple transactions at once. In other words, you must sell the stock before you can buy it again.
 *
 * If no profit can be made, then the answer should be 0.
 */
export function solveIV(contract, ns) {
    /** @type array */
    const data = contract.data
    return getProfit(data[1], data[0])
}

function getProfit(prices, maxTransactions) {
    if (maxTransactions === 0 || prices.length <= 1) {
        return 0
    }
    let maxProfit = 0
    const profits = findProfit(prices)
    if (profits.length > 0) {
        for (let profit of profits) {
            let beforeAfterMax = 0
            for (let transactionCounter = 0; transactionCounter < maxTransactions - 1; transactionCounter++) {
                beforeAfterMax = Math.max(beforeAfterMax, getProfit(prices.slice(0, profit.day1), transactionCounter) + getProfit(prices.slice(profit.day2), (maxTransactions - 1) - transactionCounter))
            }
            maxProfit = Math.max(maxProfit, profit.profit + beforeAfterMax)
        }
    }
    return maxProfit
}

function findProfit(data) {
    const profits = []
    for (let day = 0; day < data.length; day++) {
        for (let day2 = day; day2 < data.length; day2++) {
            if (data[day2] - data[day] > 0) {
                profits.push({
                    profit: data[day2] - data[day],
                    day1: day,
                    day2: day2
                })
            }
        }
    }
    return profits
}