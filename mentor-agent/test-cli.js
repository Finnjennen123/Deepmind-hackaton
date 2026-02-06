
const readline = require('readline');
const { MentorAgent } = require('./index');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

// Mock Lesson Data
const MOCK_LESSON = {
  title: "Introduction to Photosynthesis",
  content_text: "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. It takes place in the chloroplasts, which contain chlorophyll.",
  mastery_criteria: [
    "Define the inputs and outputs of photosynthesis",
    "Identify where photosynthesis occurs in the cell"
  ]
};

async function runSimulation() {
  const agent = new MentorAgent();
  
  console.log('\n📚 LESSON:', MOCK_LESSON.title);
  console.log('-----------------------------------');
  console.log(MOCK_LESSON.content_text);
  console.log('-----------------------------------\n');

  await ask("Press Enter when you are done reading...");

  let mastered = false;
  let currentContext = MOCK_LESSON;

  while (!mastered) {
    // 1. Generate Tests
    console.log('\n🔄 Generating Games...');
    const games = await agent.generateTests(currentContext);
    
    // 2. Simulate User Playing (Interactive)
    const userAnswers = {};
    
    // Game 1: QuizMaster
    console.log('\n🎮 Game 1: QuizMaster');
    userAnswers.quiz_master = [];
    if (games.QuizMaster && games.QuizMaster.questions) {
      for (const q of games.QuizMaster.questions) {
        console.log(`\nQ: ${q.text}`);
        q.options.forEach((opt, i) => console.log(`   ${i}. ${opt}`));
        const ans = await ask("Your Answer (index): ");
        userAnswers.quiz_master.push({
          question: q.text,
          selected_index: parseInt(ans),
          correct_index: q.correct_index
        });
      }
    }

    // Game 2: FlashCardHero
    console.log('\n🎮 Game 2: FlashCardHero');
    userAnswers.flash_cards = [];
    if (games.FlashCardHero && games.FlashCardHero.cards) {
        for (const card of games.FlashCardHero.cards) {
            console.log(`\nFront: ${card.front}`);
            const ans = await ask("Your Definition: ");
            userAnswers.flash_cards.push({
                front: card.front,
                expected_back: card.back,
                user_input: ans
            });
            console.log(`(Back was: ${card.back})`);
        }
    }

    // Game 3: SortItOut
    console.log('\n🎮 Game 3: SortItOut');
    userAnswers.sort_it_out = [];
    if (games.SortItOut && games.SortItOut.items) {
        console.log(`Buckets: ${games.SortItOut.buckets.join(", ")}`);
        for (const item of games.SortItOut.items) {
            const ans = await ask(`Sort "${item.text}" into which bucket? (0 or 1): `);
            const bucketIndex = parseInt(ans);
            userAnswers.sort_it_out.push({
                item: item.text,
                user_bucket: games.SortItOut.buckets[bucketIndex],
                correct_bucket: item.bucket
            });
        }
    }

    // Game 4: MatchMaker
    console.log('\n🎮 Game 4: MatchMaker');
    userAnswers.match_maker = [];
    if (games.MatchMaker && games.MatchMaker.pairs) {
        const lefts = games.MatchMaker.pairs.map(p => p.left);
        const rights = games.MatchMaker.pairs.map(p => p.right); // In real game these would be shuffled
        
        console.log("Connect these terms:");
        lefts.forEach((l, i) => console.log(`${i}: ${l}`));
        console.log("\nTo these definitions:");
        rights.forEach((r, i) => console.log(`${i}: ${r}`));

        for (let i = 0; i < lefts.length; i++) {
            const ans = await ask(`Match term ${i} to definition index: `);
            userAnswers.match_maker.push({
                term: lefts[i],
                user_match: rights[parseInt(ans)],
                correct_match: games.MatchMaker.pairs[i].right
            });
        }
    }

    // Game 5: FillTheGap
    console.log('\n🎮 Game 5: FillTheGap');
    userAnswers.fill_the_gap = [];
    if (games.FillTheGap) {
        console.log(`\nText: ${games.FillTheGap.text}`);
        for (const blank of games.FillTheGap.blanks) {
            const ans = await ask(`Fill in [${blank.id}]: `);
            userAnswers.fill_the_gap.push({
                id: blank.id,
                user_input: ans,
                correct_answer: blank.answer
            });
        }
    }

    // Game 6: FeynmanBoard (Most important for open text)
    console.log('\n🎮 Game 6: FeynmanBoard');
    if (games.FeynmanBoard) {
      console.log(`\nPrompt: ${games.FeynmanBoard.prompt}`);
      const explanation = await ask("Your Explanation: ");
      userAnswers.feynman_board = {
        prompt: games.FeynmanBoard.prompt,
        user_explanation: explanation
      };
    }

    // 3. Evaluate
    console.log('\n⚖️ Evaluating...');
    const result = await agent.evaluate(currentContext, userAnswers);
    
    console.log('\n📝 VERDICT:', result.passed ? 'PASSED ✅' : 'FAILED ❌');
    
    if (result.passed) {
      mastered = true;
      console.log('🎉 Congratulations! You have mastered this lesson.');
    } else {
      console.log('⚠️ Gaps Identified:', result.gaps);
      
      // 4. Remediate
      console.log('\n👨‍🏫 Teacher is preparing remedial content...');
      const remedialContent = await agent.remediate(currentContext, result.gaps);
      
      console.log('\n📘 REMEDIAL LESSON');
      console.log('-----------------------------------');
      console.log(remedialContent);
      console.log('-----------------------------------\n');
      
      await ask("Press Enter when you are ready to try again...");
      // Loop continues...
    }
  }

  rl.close();
}

runSimulation().catch(console.error);
