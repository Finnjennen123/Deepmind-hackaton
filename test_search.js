
require('dotenv').config();
const { searchWeb } = require('./search/webSearch');

async function test() {
    console.log('🧪 Testing Search Utility...');

    const query = 'agents with langgraph';
    console.log(`\nSearching for: "${query}"...`);

    const results = await searchWeb(query);

    if (results.length === 0) {
        console.error('❌ No results found. Check your API key or connection.');
        return;
    }

    console.log(`✅ Found ${results.length} results:`);
    results.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.title}`);
        console.log(`   URL: ${r.url}`);
        console.log(`   Snippet: ${r.snippets[0]?.substring(0, 100)}...`);
    });
}

test();
