/**
 * You are given an array of integers where each element represents the
 * maximum possible jump distance from that position. For example, if you
 * are at position i and your maximum jump length is n, then you can jump
 * to any position from i to i+n.
 * 
 * Assuming you are initially positioned at the start of the array, determine
 * whether you are able to reach the last index of the array EXACTLY.
 * 
 * @param {*} contract 
 * @param {*} ns 
 * @returns 
 */
export function solve(contract, ns) {
    /** @type array */
    const data = contract.data
    // [4,6,1,7,7,4,10,1,4,1,9,5,0,8,3,6,7] -> false?
    // [9,9,5,2,3,9,1,10,1,0,0,6,10,5,5,5,10,7,5,0,6,0] -> true?
    let arrayJump = [1];

    for (let n = 0; n < data.length; n++) {
        if (arrayJump[n]) {
            for (let p = n; p <= Math.min(n + data[n], data.length - 1); p++) { // fixed off-by-one error
                arrayJump[p] = 1;
            }
        }
    }

    return 0 + Boolean(arrayJump[data.length - 1]); // thanks /u/Kalumniatoris
}