/**
 * You are in a grid with 8 rows and 8 columns, and you are positioned in the top-left corner of that grid. 
 * You are trying to reach the bottom-right corner of the grid, but you can only move down or right on each step. 
 * Determine how many unique paths there are from start to finish.

 NOTE: The data returned for this contract is an array with the number of rows and columns:

 [8, 8]
 */
export function solve(contract) {
    const data = contract.data
    return numberOfPaths(data[0], data[1])
}

// https://www.geeksforgeeks.org/count-possible-paths-top-left-bottom-right-nxm-matrix/
// Returns count of possible paths to reach
// cell at row number m and column number n
// from the topmost leftmost cell (cell at 1, 1)
function numberOfPaths(m, n) {

    // If either given row number is first or
    // given column number is first
    if (m == 1 || n == 1)
        return 1;

    // If diagonal movements are allowed then
    // the last addition is required.
    return numberOfPaths(m - 1, n) + numberOfPaths(m, n - 1);

    // + numberOfPaths(m - 1, n - 1);
}