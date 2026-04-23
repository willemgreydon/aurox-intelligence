export function compositeScore(scores) {
    if (scores.length === 0)
        return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
