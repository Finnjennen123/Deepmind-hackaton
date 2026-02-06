
// For course structure generation — broad queries about the subject
const buildStructureQueries = (highLevel) => {
    const subject = highLevel.onboarding.subject;
    // Get current year for relevance
    const year = new Date().getFullYear();

    return [
        `${subject} comprehensive guide`,
        `${subject} key topics to learn`,
        `${subject} latest developments ${year}`
    ];
};

// For lesson generation — specific queries about the lesson topic
const buildLessonQueries = (lesson) => {
    return [
        `${lesson.title}`,
        `${lesson.title} guide explanation`
    ];
};

module.exports = {
    buildStructureQueries,
    buildLessonQueries
};
