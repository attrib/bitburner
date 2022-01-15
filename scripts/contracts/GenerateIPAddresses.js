/**
 * Given the following string containing only digits, return an array with all possible valid IP address combinations that can be created from the string:
 *
 * 212242134136
 *
 * Note that an octet cannot begin with a '0' unless the number itself is actually 0. For example, '192.168.010.1' is not a valid IP.
 *
 * Examples:
 * 
 * 25525511135 -> [255.255.11.135, 255.255.111.35]
 * 1938718066 -> [193.87.180.66]
 */
export function solve(contract, ns) {
    /** @type string */
    const data = contract.data
    const results = []

    for (let first = 0; first < 3; first++) {
        let part1 = getPart(data, 0, first + 1)
        for (let second = 0; second < 3; second++) {
            let part2 = getPart(data, first + 1, first + 1 + second + 1)
            if (!part2) {
                continue
            }
            for (let third = 0; third < 3; third++) {
                let part3 = getPart(data, first + 1 + second + 1, first + 1 + second + 1 + third + 1)
                if (!part3) {
                    continue
                }
                for (let fourth = 0; fourth < 3; fourth++) {
                    let part4 = getPart(data, first + 1 + second + 1 + third + 1, data.length)
                    if (!part4) {
                        continue
                    }
                    let ip = `${part1}.${part2}.${part3}.${part4}`
                    if (validIp(part1, part2, part3, part4) && results.indexOf(ip) === -1) {
                        results.push(ip)
                    }
                }
            }
        }
    }

    return results
}

function getPart(string, index1, index2) {
    if (index2 > string.length) {
        return null
    }
    let part = string.slice(index1, index2)
    if (part.charAt(0) === '0') {
        return null
    }
    return part
}

function validIp(first, second, thrid, fourth) {
    for (let part of [first, second, thrid, fourth]) {
        part = parseInt(part)
        if (isNaN(part)) {
            return false
        }
        if (part < 0 || part > 255) {
            return false
        }
    }
    return true
}