/**
 * Given an array of integers, find the contiguous subarray (containing
 * at least one number) which has the largest sum and return that sum.
 * 
 * @param {*} contract 
 * @param {import("./../..").NS} ns 
 * @returns 
 */
export function solve(contract, ns) {
    /** @type array */
    let data = contract.data

    var max_so_far = Number.NEGATIVE_INFINITY
    var max_ending_here = 0

    for (var i = 0; i < data.length; i++) {
        max_ending_here = max_ending_here + data[i]
        if (max_so_far < max_ending_here)
            max_so_far = max_ending_here

        if (max_ending_here < 0)
            max_ending_here = 0
    }
    return max_so_far
}