export function magnitude(x, y) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

export function textToMatrix(text) {
    return text.split("\n").map((row) => row.split(""));
}

export function randomSelect(array) {
    return array[Math.floor(Math.random() * array.length)];
}

export function gaussianRandom(mu = 0, sigma = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * sigma + mu;
}
