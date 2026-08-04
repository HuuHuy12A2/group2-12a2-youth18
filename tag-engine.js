const TagEngine = (() => {
    let mediaData = [];
    let availableTags = [];
    async function init() {
        try {
            const response = await fetch("data/media.json", {
                cache: "no-store"
            });
            if (!response.ok) {
                throw new Error("Không thể tải media.json");
            }
            mediaData = await response.json();
            availableTags = collectTags(mediaData);
            return true;
        } catch (error) {
            console.error("Tag Engine:", error);
            return false;
        }
    }
    function collectTags(data) {
        const tagMap = new Map();
        data.forEach(item => {
            if (!Array.isArray(item.tags)) {
                return;
            }
            item.tags.forEach(tag => {
                if (typeof tag !== "string" || !tag.trim()) {
                    return;
                }
                const name = tag.trim();
                const key = normalize(name);
                if (!tagMap.has(key)) {
                    tagMap.set(key, {
                        name,
                        key,
                        tokens: tokenize(name)
                    });
                }
            });
        });
        return [...tagMap.values()];
    }
    function normalize(value) {
        return String(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[_\s]+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function normalizeCompact(value) {
        return normalize(value).replace(/-/g, "");
    }
    function tokenize(value) {
        return normalize(value)
            .split("-")
            .filter(Boolean);
    }
    function getBaseName(fileName) {
        const lastDot = fileName.lastIndexOf(".");
        if (lastDot === -1) {
            return fileName;
        }
        return fileName.slice(0, lastDot);
    }
    function getKeywords(fileName) {
        const baseName = getBaseName(fileName);
        return baseName
            .split("-")
            .map(keyword => keyword.trim())
            .filter(Boolean);
    }
    function getExtension(fileName) {
        const lastDot = fileName.lastIndexOf(".");
        if (lastDot === -1) {
            return "";
        }
        return fileName
            .slice(lastDot + 1)
            .toLowerCase();
    }
    function findExactMatch(value) {
        const key = normalize(value);
        return availableTags.find(tag => {
            return tag.key === key;
        }) || null;
    }
    function findCompactMatch(value) {
        const key = normalizeCompact(value);
        return availableTags.find(tag => {
            return normalizeCompact(tag.name) === key;
        }) || null;
    }
    function findLongestMatch(keywords, startIndex) {
        let bestMatch = null;
        for (
            let endIndex = keywords.length;
            endIndex > startIndex;
            endIndex--
        ) {
            const candidate = keywords
                .slice(startIndex, endIndex)
                .join("-");
            const exactMatch = findExactMatch(candidate);
            if (exactMatch) {
                bestMatch = {
                    tag: exactMatch,
                    endIndex,
                    source: "exact"
                };
                break;
            }
            const compactMatch = findCompactMatch(candidate);
            if (compactMatch) {
                bestMatch = {
                    tag: compactMatch,
                    endIndex,
                    source: "normalized"
                };
                break;
            }
        }
        return bestMatch;
    }
    function calculateSimilarity(firstValue, secondValue) {
        const first = normalizeCompact(firstValue);
        const second = normalizeCompact(secondValue);
        if (!first || !second) {
            return 0;
        }
        if (first === second) {
            return 1;
        }
        const distance = levenshteinDistance(first, second);
        return 1 - distance / Math.max(
            first.length,
            second.length
        );
    }
    function levenshteinDistance(first, second) {
        const matrix = Array.from(
            {
                length: second.length + 1
            },
            () => Array(first.length + 1).fill(0)
        );
        for (let i = 0; i <= second.length; i++) {
            matrix[i][0] = i;
        }
        for (let j = 0; j <= first.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= second.length; i++) {
            for (let j = 1; j <= first.length; j++) {
                const cost = second[i - 1] === first[j - 1]
                    ? 0
                    : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[second.length][first.length];
    }
    function findSimilarTags(value, limit = 3) {
        const results = availableTags
            .map(tag => ({
                ...tag,
                score: calculateSimilarity(value, tag.name)
            }))
            .filter(tag => tag.score >= 0.65)
            .sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }
    function createNewTag(value) {
        const name = value
            .trim()
            .split(/[\s_]+/)
            .filter(Boolean)
            .map(word => {
                return word.charAt(0).toUpperCase()
                    + word.slice(1).toLowerCase();
            })
            .join("-");
        return {
            name,
            key: normalize(name)
        };
    }
    function analyzeUnknownKeyword(keyword) {
        const suggestions = findSimilarTags(keyword);
        if (suggestions.length > 0) {
            return {
                keyword,
                status: "suggestion",
                tag: null,
                suggestions,
                source: "fuzzy"
            };
        }
        const newTag = createNewTag(keyword);
        return {
            keyword,
            status: "new",
            tag: newTag.name,
            suggestions: [],
            source: "new"
        };
    }
    function analyzeFileName(fileName) {
        const keywords = getKeywords(fileName);
        const results = [];
        let index = 0;
        while (index < keywords.length) {
            const longestMatch = findLongestMatch(
                keywords,
                index
            );
            if (longestMatch) {
                const originalKeyword = keywords
                    .slice(index, longestMatch.endIndex)
                    .join("-");
                results.push({
                    keyword: originalKeyword,
                    status: "matched",
                    tag: longestMatch.tag.name,
                    score: 1,
                    source: longestMatch.source
                });
                index = longestMatch.endIndex;
                continue;
            }
            const unknownKeyword = keywords[index];
            results.push(analyzeUnknownKeyword(unknownKeyword));
            index++;
        }
        return results;
    }
    function getTagsFromAnalysis(analysis) {
        return analysis
            .filter(item => item.tag)
            .map(item => item.tag);
    }
    function getAllTags() {
        return [...availableTags];
    }
    function getMediaData() {
        return [...mediaData];
    }
    return {
        init,
        analyzeFileName,
        getTagsFromAnalysis,
        getAllTags,
        getMediaData,
        getKeywords,
        getExtension,
        normalize
    };
})();