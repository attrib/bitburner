/**
 * You are given a string which contains only digits between 0 and 9 as well as a target
 * number. Return all possible ways you can add the +, -, and * operators to the string
 * of digits such that it evaluates to the target number.
 * 
 * The answer should be provided as an array of strings containing the valid expressions.
 * 
 * NOTE: Numbers in an expression cannot have leading 0’s
 * 
 * Examples:
 *  Input: digits = “123”, target = 6
 *  Output: [1+2+3, 1*2*3]
 * 
 *  Input: digits = “105”, target = 5
 *  Output: [1*0+5, 10-5]
 * 
 * @param {*} contract 
 * @param {import("./../..").NS} ns 
 * @returns 
 */
export function solve(contract, ns) {
    const data = contract.data
    nss = ns

    let result = []
    getExprUtil(result, data[0], data[1])

    return result
}

let nss

/**
 * Utility recursive method to generate all possible
 * expressions
 * 
 * @param {Array} result 
 * @param {string} input 
 * @param {string} target 
 * @param {string} curExp 
 * @param {int} pos 
 * @param {int} curVal 
 * @param {int} last 
 * @returns 
 */
function getExprUtil(result, input, target, curExp = "", pos = 0, curVal = 0, last = 0) {
    // true if whole input is processed with some
    // operators
    if (pos == input.length) {
        // if current value is equal to target
        //then only add to final solution
        // if question is : all possible o/p then just
        //push_back without condition
        if (curVal == target) {
            result.push(curExp);
        }
        return;
    }

    // loop to put operator at all positions
    for (let i = pos; i < input.length; i++) {
        // ignoring case which start with 0 as they
        // are useless for evaluation
        if (i != pos && input[pos] == '0') {
            break;
        }

        // take part of input from pos to i
        let part = input.substring(pos, i + 1);

        // take numeric value of part
        let cur = parseInt(part);

        // if pos is 0 then just send numeric value
        // for next recursion
        if (pos == 0) {
            getExprUtil(result, input, target, curExp + part, i + 1, cur, cur);
        }
        // try all given binary operator for evaluation
        else {
            getExprUtil(result, input, target, curExp + "+" + part, i + 1, curVal + cur, cur);
            getExprUtil(result, input, target, curExp + "-" + part, i + 1, curVal - cur, -cur);
            getExprUtil(result, input, target, curExp + "*" + part, i + 1, curVal - last + last * cur, last * cur);
        }
    }
}