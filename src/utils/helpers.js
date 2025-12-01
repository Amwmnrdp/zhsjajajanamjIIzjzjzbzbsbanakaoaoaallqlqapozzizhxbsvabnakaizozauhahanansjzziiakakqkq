function parseEmoji(emoji) {
    const regex = /<(a)?:(\w+):(\d+)>/;
    const match = emoji.match(regex);
    if (match) {
        return {
            animated: !!match[1],
            name: match[2],
            id: match[3]
        };
    }
    return { id: null };
}

module.exports = {
    parseEmoji
};
