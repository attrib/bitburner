/**
 * It is possible write four as a sum in exactly four different ways:

     3 + 1
     2 + 2
     2 + 1 + 1
     1 + 1 + 1 + 1

 How many different ways can the number 69 be written as a sum of at least two positive integers?
 */
export function solve(contract, ns) {
    const data = contract.data

    return NumberOfways(data, data - 1)
}

// https://www.geeksforgeeks.org/ways-to-sum-to-n-using-natural-numbers-up-to-k-with-repetitions-allowed/
// Function to find the total number of
// ways to represent N as the sum of
// integers over the range [1, K]
function NumberOfways(N, K) {
    // Initialize a list
    let dp = Array.from({ length: N + 1 }, (_, i) => 0);

    // Update dp[0] to 1
    dp[0] = 1;

    // Iterate over the range [1, K + 1]
    for (let row = 1; row < K + 1; row++) {

        // Iterate over the range [1, N + 1]
        for (let col = 1; col < N + 1; col++) {

            // If col is greater
            // than or equal to row
            if (col >= row)

                // Update current
                // dp[col] state
                dp[col] = dp[col] + dp[col - row];
        }
    }

    // Return the total number of ways
    return (dp[N]);
}