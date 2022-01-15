class Stock {

    /** @type {import("./..").NS} **/
    static ns
    /** @type {import("./..").TIX} **/
    stock
    amount = 0
    purchaseCosts = 0
    totalProfit = 0
    maxAmount

    symbol

    constructor(symbol) {
        this.symbol = symbol
        this.stock = Stock.ns.stock
        this.maxAmount = this.stock.getMaxShares(this.symbol)
        const [shares, avgPx, sharesShort, avgPxShort] = this.stock.getPosition(this.symbol)
        this.amount = shares
        this.purchaseCosts = avgPx
    }

    get volatility() {
        return this.stock.getVolatility(this.symbol)
    }

    get forecast() {
        return this.stock.getForecast(this.symbol)
    }

    get spread() {
        return this.stock.getAskPrice(this.symbol) - this.stock.getBidPrice(this.symbol)
    }

    get purchasePrice() {
        return this.stock.getAskPrice(this.symbol)
    }

    get sellPrice() {
        return this.stock.getBidPrice(this.symbol)
    }

    get sellValue() {
        return this.sellPrice * this.amount
    }

    salesGain(amount) {
        return this.stock.getSaleGain(this.symbol, amount, 'Long')
    }

    profit(amount) {
        return (this.salesGain(amount) - this.purchaseCosts * amount) / (this.purchaseCosts * amount)
    }

    get expRet() {
        return this.stock.getVolatility(this.symbol) * (this.forecast - 0.5)
    }

    purchase(amount) {
        let cost = this.stock.getPurchaseCost(this.symbol, amount, 'Long')
        let price = this.stock.buy(this.symbol, amount)
        if (price > 0) {
            this.amount = this.stock.getPosition(this.symbol)[0]
            this.purchaseCosts = this.stock.getPosition(this.symbol)[1]
            return cost
        }
        return 0
    }

    sell(amount) {
        let salePrice = this.salesGain(amount)
        let price = this.stock.sell(this.symbol, amount)
        if (price > 0) {
            this.totalProfit += salePrice - this.purchaseCosts * amount
            this.purchaseCosts = this.stock.getPosition(this.symbol)[1]
            this.amount = this.stock.getPosition(this.symbol)[0]
            return salePrice
        }
        return 0
    }

    toString() {
        return `${this.symbol}: ${this.amount} | ${this.expRet.toFixed(4)} | ${Stock.ns.nFormat(this.totalProfit, '($0.000a)')}`
    }
}

/** @param {import("./..").NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['money', 0.3]
    ])
    ns.disableLog('ALL')
    Stock.ns = ns

    const stocks = []
    let symbols = ns.stock.getSymbols()
    const NUMBER_OF_DIFFERENT_SHARES_MAX = 5
    const COMMISSION = 100000
    const NUMCYCLES = 4
    for (let symbol of symbols) {
        let stock = new Stock(symbol)
        stocks.push(stock)
    }

    while (1) {
        if (ns.getPlayer().money <= 1e7) {
            ns.print('Waiting 60 seconds, not enough money yet')
            await ns.sleep(60000)
        }
        let totalSellValue = stocks.reduce((prev, stock) => prev + stock.sellValue, 0)
        let money = (totalSellValue + ns.getPlayer().money) * flags.money - totalSellValue

        stocks.sort((a, b) => b.expRet - a.expRet)

        let NUMBER_OF_DIFFERENT_SHARES = 0
        for (let stock of stocks) {
            if (stock.expRet > stocks[0].expRet * 0.7) {
                NUMBER_OF_DIFFERENT_SHARES++
            }
        }
        NUMBER_OF_DIFFERENT_SHARES = Math.min(NUMBER_OF_DIFFERENT_SHARES, NUMBER_OF_DIFFERENT_SHARES_MAX)
        NUMBER_OF_DIFFERENT_SHARES = Math.max(1, NUMBER_OF_DIFFERENT_SHARES)

        // Sell bad performing
        for (let stock of stocks) {
            if (stock.amount > 0 && stock.expRet < stocks[NUMBER_OF_DIFFERENT_SHARES].expRet) {
                money += stock.sell(stock.amount)
                ns.print(`Sold ${stock.symbol} - total profit ${ns.nFormat(stock.totalProfit, '($0.000a)')}`)
            }
        }

        // Money needed
        for (let stock of stocks) {
            if (stock.amount > 0 && money < 2 * COMMISSION) {
                const sellShares = Math.min(Math.abs(Math.floor(money / stock.sellPrice)), stock.amount)
                money += stock.sell(sellShares)
                ns.print(`Sold ${sellShares} ${stock.symbol} because ${ns.nFormat(money, '($0.000a)')} money needed - total profit ${ns.nFormat(stock.totalProfit, '($0.000a)')}`)
            }
        }

        // Buy new
        let currentStockCount = stocks.reduce((prev, cur) => prev + (cur.amount > 0 ? 1 : 0), 0)
        for (let stock of stocks) {
            const numShares = Math.min(Math.floor((money - COMMISSION) / stock.purchasePrice), stock.maxAmount - stock.amount);
            if (numShares > 0 && (numShares * stock.expRet * stock.purchasePrice * NUMCYCLES) > COMMISSION && (stock.amount > 0 || currentStockCount <= NUMBER_OF_DIFFERENT_SHARES)) {
                currentStockCount += stock.amount > 0 ? 0 : 1
                let buyPrice = stock.purchase(numShares)
                money -= buyPrice
                ns.print(`Purchased ${numShares} ${stock.symbol} for ${ns.nFormat(buyPrice, '($0.000a)')} (Total ${ns.nFormat(stock.purchaseCosts, '($0.000a)')})`)
            }
        }

        // let totalProfit = stocks.reduce((prev, stock) => prev + stock.totalProfit, 0)
        // let totalMoneyInStocks = stocks.reduce((prev, stock) => prev + stock.sellValue, 0)
        // ns.print(`Current profit: ${ns.nFormat(totalProfit, '($0.000a)')} | Current available money: ${ns.nFormat(money, '($0.000a)')} | Current money in stocks ${ns.nFormat(totalMoneyInStocks, '($0.000a)')}`)
        await ns.sleep(NUMCYCLES * 5000 + 200)
    }
}