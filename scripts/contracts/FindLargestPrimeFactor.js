/**
 * Given a number, find its largest prime factor. A prime factor
 * is a factor that is a prime number.
 */
export function solve(contract, ns) {
    /** @type int */
    const data = contract.data

    var divisor = 2;
    var number = data;
    while (number > 1) {
        if (number % divisor === 0) {
            number /= divisor;
        } else {
            divisor++;
        }
    }

    return divisor
}