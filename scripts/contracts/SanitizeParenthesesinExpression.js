/**
 * Given a string with parentheses and letters, remove the minimum number of invalid
 * parentheses in order to validate the string. If there are multiple minimal ways
 * to validate the string, provide all of the possible results.
 * 
 * The answer should be provided as an array of strings. If it is impossible to validate
 * the string, the result should be an array with only an empty string.
 * 
 * Examples:
 *   ()())()     -> [()()(), (())()]
 *   (a)())()   -> [(a)()(), (a())()]
 *   )(         -> [“”]
 * 
 * @param {*} contract 
 * @param {*} ns 
 * @returns 
 */
export function solve(contract, ns) {
    /** @type string */
    let data = contract.data

    const validStrings = []

    // removing from back all open (
    // ()((aa(aaa))         (a(()(()()())a
    let remove = false
    let keep = []
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i] === ')') {
            break
        }
        if (data[i] === '(') {
            remove = i
        }
        else {
            keep.push(data[i])
            remove = i
        }
    }
    if (remove !== false) {
        data = data.substring(0, remove)
        if (keep.length > 0) {
            keep.reverse()
            data += keep.join('')
        }
    }

    remove = false
    keep = []
    for (let i = 0; i < data.length; i++) {
        if (data[i] === '(') {
            break
        }
        if (data[i] === ')') {
            remove = i
        }
        else {
            keep.push(data[i])
            remove = i
        }
    }

    if (remove !== false) {
        data = data.substring(remove + 1)
        if (keep.length > 0) {
            data = keep.join('') + data
        }
    }

    removeInvalidParenthesis(data, validStrings)

    return validStrings
}

function isValidString(str) {
    let counter = 0
    for (let i = 0; i < str.length; i++) {
        counter += str[i] === '(' ? 1 : 0
        counter -= str[i] === ')' ? 1 : 0
        if (counter < 0) {
            return false
        }
    }
    return counter === 0;
}

function removeInvalidParenthesis(str, removeInvalidParenthesis) {
    if (str.length == 0)
        return;

    // visit set to ignore already visited string
    let visit = new Set();

    // queue to maintain BFS
    let q = [];
    let temp;
    let level = false;

    // pushing given string as
    // starting node into queue
    q.push(str);
    visit.add(str);
    while (q.length != 0) {
        str = q.shift();
        if (isValidString(str)) {
            removeInvalidParenthesis.push(str)

            // If answer is found, make level true
            // so that valid string of only that level
            // are processed.
            level = true;
        }
        if (level)
            continue;
        for (let i = 0; i < str.length; i++) {
            if (str[i] !== '(' && str[i] !== ')')
                continue;

            // Removing parenthesis from str and
            // pushing into queue,if not visited already
            temp = str.substring(0, i) + str.substring(i + 1);
            if (!visit.has(temp)) {
                q.push(temp);
                visit.add(temp);
            }
        }
    }
}