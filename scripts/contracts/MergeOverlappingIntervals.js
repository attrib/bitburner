/**
 * Given the following array of array of numbers representing a list of intervals, merge all overlapping intervals.

 [[21,27],[1,8],[8,14],[16,25],[20,23],[6,15],[25,34],[22,32],[16,26],[18,22],[2,9],[7,12],[14,20],[6,14],[20,23],[12,21],[12,19],[22,23],[13,22],[18,28]]

 Example:

 [[1, 3], [8, 10], [2, 6], [10, 16]]

 would merge into [[1, 6], [8, 16]].

 The intervals must be returned in ASCENDING order. You can assume that in an interval, the first number will always be smaller than the second.
 *
 * @param {Contract} contract 
 * @param {import("../../.").NS} ns
 * @returns 
 */
export function solve(contract, ns) {
    /** @type [] */
    const data = contract.data
    const result = []
    data.sort((a, b) => a[0] - b[0])

    result.push(data.shift())

    for (const part of data) {
        let found = false
        for (let [i, existing] of result.entries()) {
            if (part[0] >= existing[0] && existing[1] >= part[0]) {
                result[i][1] = Math.max(...part, ...existing)
                found = true
                break
            }
        }
        if (!found) {
            result.push(part)
        }
    }

    result.sort((a, b) => a[0] - b[0])
    return result
}