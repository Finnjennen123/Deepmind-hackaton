
const dotenv = require('dotenv');
const path = require('path');
const { TEST_GENERATOR_PROMPT, EVALUATOR_PROMPT, REMEDIATOR_PROMPT } = require('./prompts');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

class MentorAgent {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
    this.model = "google/gemini-3-flash-preview";
  }

  async callLLM(systemPrompt, userContent, jsonMode = true) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/your-repo",
          "X-Title": "Mentor Agent"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(userContent) }
          ],
          response_format: jsonMode ? { type: "json_object" } : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      return jsonMode ? JSON.parse(content) : content;
    } catch (error) {
      console.error('LLM Call Failed:', error);
      throw error;
    }
  }

  // Step 1: Generate Tests
  async generateTests(lessonContext) {
    console.log('🤖 Generating tests...');
    return await this.callLLM(TEST_GENERATOR_PROMPT, lessonContext, true);
  }

  // Step 2: Evaluate Answers
  async evaluate(lessonContext, userAnswers) {
    console.log('🤖 Evaluating performance...');
    const input = {
      mastery_criteria: lessonContext.mastery_criteria,
      user_answers: userAnswers
    };
    return await this.callLLM(EVALUATOR_PROMPT, input, true);
  }

  // Step 3: Remediate
  async remediate(lessonContext, gaps) {
    console.log('🤖 Generating remedial content...');
    const input = {
      original_lesson: lessonContext,
      identified_gaps: gaps
    };
    return await this.callLLM(REMEDIATOR_PROMPT, input, false); // Markdown output
  }
}

module.exports = { MentorAgent };
